import { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../mocks/transactions';
import { api } from '../services/api';
import { announcePayment } from '../services/speech';
import { notifyPaymentReceived } from '../services/pushNotifications';
import { useAuth } from './AuthStore';

const INTEGRATIONS_KEY = 'yaplin.integrations.v1';
const PREFERENCES_KEY = 'yaplin.preferences.v1';

export type PlinBank = 'bbva' | 'interbank' | 'scotiabank';

export interface IntegrationsState {
  yape: boolean;
  izipay: boolean;
  plinBanks: Record<PlinBank, boolean>;
}

const DEFAULT_INTEGRATIONS: IntegrationsState = {
  yape: false,
  izipay: false,
  plinBanks: { bbva: false, interbank: false, scotiabank: false },
};

export interface PreferencesState {
  voiceEnabled: boolean;
  pushEnabled: boolean;
  captureActive: boolean;
}

const DEFAULT_PREFERENCES: PreferencesState = {
  voiceEnabled: false,
  pushEnabled: false,
  captureActive: true,
};

interface RemoteTransaction {
  id: string;
  businessId: string;
  storeId: string | null;
  payerName: string;
  payerInitials: string;
  originalAmount: number;
  amount: number;
  method: string;
  timestamp: string;
  reference: string;
  status: string;
  read: boolean;
  source: string;
  version: number;
  createdAt?: string;
}

function fromRemote(t: RemoteTransaction): Transaction {
  return {
    id: t.id,
    businessId: t.businessId,
    storeId: t.storeId,
    payerName: t.payerName,
    payerInitials: t.payerInitials,
    originalAmount: t.originalAmount,
    amount: t.amount,
    method: t.method as Transaction['method'],
    timestamp: new Date(t.timestamp),
    reference: t.reference,
    status: t.status as Transaction['status'],
    read: t.read,
    source: t.source as Transaction['source'],
    version: t.version,
  };
}

// GET /transactions/:id/events — full immutable timeline entry. `payload`'s
// exact shape depends on `type` (see backend transactions.ts), so callers
// narrow it themselves based on `type` when rendering.
export interface TransactionEvent {
  id: string;
  type:
    | 'CAPTURED'
    | 'MANUAL_CREATED'
    | 'ASSIGNED'
    | 'RETURNED_TO_GENERAL'
    | 'AMOUNT_CORRECTED'
    | 'VOIDED'
    | 'VOID_REVERSED'
    | 'NOTE_ADDED';
  payload: Record<string, unknown>;
  actorName: string;
  actorRole: string;
  createdAt: string;
}

// Shared double-confirmation gate for money-affecting actions: exactly one
// of these two should be sent, matching whichever method the backend
// expects for this user (PIN if they configured one, else the "CONFIRMAR"
// text gate) — see verifyConfirmation() in backend/src/routes/transactions.ts.
export interface ConfirmationInput {
  confirmPin?: string;
  confirmText?: string;
}

export interface ManualTransactionInput {
  storeId: string;
  amount: number;
  payerName?: string;
  notes?: string;
  method?: string;
  timestamp?: string;
}

interface PaymentsCtxValue {
  transactions: Transaction[];
  // Unassigned (GENERAL pool) payments — fetched together with `transactions`
  // on the same refresh cycle so Dashboard and Pagos sin asignar are always
  // looking at the same snapshot instead of two independently-timed fetches
  // that could briefly disagree with each other.
  generalPool: Transaction[];
  hydrated: boolean;
  transactionsLoading: boolean;
  refreshTransactions: () => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  markAllRead: () => void;
  routeTransaction: (id: string, toStoreId: string | null, version: number) => Promise<Transaction>;
  correctAmount: (id: string, delta: number, reason: string, version: number, confirm: ConfirmationInput) => Promise<Transaction>;
  createManualTransaction: (input: ManualTransactionInput) => Promise<Transaction>;
  fetchTransactionEvents: (id: string) => Promise<TransactionEvent[]>;
  fetchTransactionById: (id: string) => Promise<Transaction>;
  integrations: IntegrationsState;
  setYape: (v: boolean) => void;
  setIzipay: (v: boolean) => void;
  setPlinBank: (bank: PlinBank, v: boolean) => void;
  preferences: PreferencesState;
  setVoiceEnabled: (v: boolean) => void;
  setPushEnabled: (v: boolean) => void;
  setCaptureActive: (v: boolean) => void;
}

const PaymentsContext = createContext<PaymentsCtxValue | null>(null);

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [generalPool, setGeneralPool] = useState<Transaction[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationsState>(DEFAULT_INTEGRATIONS);
  const [preferences, setPreferences] = useState<PreferencesState>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const hasLoadedTransactionsOnceRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [rawIntegrations, rawPreferences] = await Promise.all([
          AsyncStorage.getItem(INTEGRATIONS_KEY),
          AsyncStorage.getItem(PREFERENCES_KEY),
        ]);
        if (rawIntegrations) setIntegrations({ ...DEFAULT_INTEGRATIONS, ...JSON.parse(rawIntegrations) });
        if (rawPreferences) setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(rawPreferences) });
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations)).catch(() => {});
  }, [integrations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)).catch(() => {});
  }, [preferences, hydrated]);

  // Tracks each transaction's storeId as of the last successful fetch, so a
  // supervisor/cajero (who never has Integraciones on — see
  // useNotificationCapture.ts) can still get a sound/push alert when a
  // payment newly lands on THEIR store via sync/routing, instead of only
  // the owner ever hearing anything (the owner's alert comes from their
  // device's own native Yape/Plin/Izipay listener, a completely separate
  // path in useNotificationCapture.ts). `null` means "first load, nothing
  // to diff against yet" — otherwise every payment already on the store
  // would announce itself the moment the app opens.
  const prevStoreIdByIdRef = useRef<Map<string, string | null> | null>(null);

  const refreshTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setGeneralPool([]);
      setTransactionsLoading(false);
      prevStoreIdByIdRef.current = null;
      return;
    }
    // Only show the loader on the first real fetch — the 10s background
    // poll below must stay silent, or the indicator would flicker constantly.
    if (!hasLoadedTransactionsOnceRef.current) setTransactionsLoading(true);
    try {
      // Fetched together (same Promise.all tick) rather than on two separate
      // timers — Dashboard (assigned + unassigned combined) and Pagos sin
      // asignar (unassigned only) both read from this single snapshot, so
      // they can't disagree with each other the way two independently-timed
      // fetches could.
      const [remote, remoteGeneral] = await Promise.all([
        api.get<RemoteTransaction[]>('/transactions'),
        api.get<RemoteTransaction[]>('/transactions/general'),
      ]);
      const next = remote.map(fromRemote);
      const nextGeneral = remoteGeneral.map(fromRemote);

      if (user.role !== 'owner' && prevStoreIdByIdRef.current) {
        const prevStoreById = prevStoreIdByIdRef.current;
        const newlyMine = next.filter((txn) => {
          if (txn.storeId !== user.storeId) return false;
          return prevStoreById.get(txn.id) !== user.storeId; // wasn't already theirs last check
        });
        // Voice is gated by BOTH the owner/supervisor-assigned permission
        // (user.soundAlertEnabled) and this device's own personal toggle
        // (preferences.voiceEnabled) — the permission decides whether this
        // member is allowed to hear payments at all, the toggle is theirs to
        // mute it moment-to-moment. Push has no such admin permission (it
        // never did, even before this feature), just their own toggle.
        if (user.soundAlertEnabled && preferences.voiceEnabled) {
          newlyMine.forEach((txn) => {
            try {
              announcePayment(txn);
            } catch (e) {
              if (__DEV__) console.log('[YapLin] announcePayment (sync) ERROR', String(e));
            }
          });
        }
        if (preferences.pushEnabled) {
          newlyMine.forEach((txn) => {
            notifyPaymentReceived(txn).catch((e) => {
              if (__DEV__) console.log('[YapLin] notifyPaymentReceived (sync) ERROR', String(e));
            });
          });
        }
      }
      prevStoreIdByIdRef.current = new Map(next.map((txn) => [txn.id, txn.storeId]));

      setTransactions(next);
      setGeneralPool(nextGeneral);
    } finally {
      hasLoadedTransactionsOnceRef.current = true;
      setTransactionsLoading(false);
    }
  }, [user, preferences.voiceEnabled, preferences.pushEnabled]);

  useEffect(() => {
    refreshTransactions().catch(() => {});
  }, [refreshTransactions]);

  // Poll so payments captured on other devices/accounts show up without
  // needing to close and reopen the app. Skipped while "Pausar captura" is
  // on, since polling every 5s is the main background battery/data cost.
  useEffect(() => {
    if (!user || !preferences.captureActive) return;
    const interval = setInterval(() => {
      refreshTransactions().catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [user, preferences.captureActive, refreshTransactions]);

  const value = useMemo<PaymentsCtxValue>(() => ({
    transactions,
    generalPool,
    hydrated,
    transactionsLoading,
    refreshTransactions,
    addTransaction: async (t) => {
      // No optimistic pre-add: a freshly-captured payment's eventual
      // storeId (unassigned vs. auto-assigned to a business's one active
      // store) is decided by the backend, not the client — guessing wrong
      // meant placing it in `transactions` when it was actually unassigned,
      // which then visibly popped back out once the next poll's
      // correctly-scoped list replaced it (reported as payments briefly
      // duplicating/inflating the count then "regularizing"). Waiting for
      // the server's response and placing it in the list it actually
      // belongs to avoids that flicker entirely.
      const saved = await api.post<RemoteTransaction>('/transactions', {
        payerName: t.payerName,
        payerInitials: t.payerInitials,
        amount: t.amount,
        method: t.method,
        timestamp: t.timestamp.toISOString(),
        reference: t.reference,
        status: t.status,
      });
      const created = fromRemote(saved);
      if (created.storeId === null) {
        setGeneralPool(prev => (prev.some(x => x.id === created.id) ? prev : [created, ...prev]));
      } else {
        setTransactions(prev => (
          prev.some(x => x.id === created.id) ? prev : [created, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        ));
      }
    },
    markAllRead: () => {
      setTransactions(prev => prev.map(t => (t.read ? t : { ...t, read: true })));
      api.post('/transactions/mark-all-read').catch(() => {});
    },
    routeTransaction: async (id, toStoreId, version) => {
      const saved = await api.post<RemoteTransaction>(`/transactions/${id}/route`, { toStoreId, version });
      const updated = fromRemote(saved);
      // Moves the transaction between the two lists to match its new
      // storeId — routing INTO a store takes it out of generalPool, routing
      // back to GENERAL (storeId null) takes it out of transactions.
      if (updated.storeId === null) {
        setTransactions(prev => prev.filter(x => x.id !== id));
        setGeneralPool(prev => (prev.some(x => x.id === id) ? prev.map(x => (x.id === id ? updated : x)) : [updated, ...prev]));
      } else {
        setGeneralPool(prev => prev.filter(x => x.id !== id));
        setTransactions(prev => (
          prev.some(x => x.id === id)
            ? prev.map(x => (x.id === id ? updated : x))
            : [updated, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        ));
      }
      return updated;
    },
    correctAmount: async (id, delta, reason, version, confirm) => {
      const saved = await api.patch<RemoteTransaction>(`/transactions/${id}/correct-amount`, { delta, reason, version, ...confirm });
      const updated = fromRemote(saved);
      setTransactions(prev => prev.map(x => (x.id === id ? updated : x)));
      return updated;
    },
    createManualTransaction: async (input) => {
      const saved = await api.post<RemoteTransaction>('/transactions/manual', input);
      const created = fromRemote(saved);
      setTransactions(prev => [created, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      return created;
    },
    fetchTransactionEvents: (id) => api.get<TransactionEvent[]>(`/transactions/${id}/events`),
    // GET /transactions only returns already-assigned payments, so anything
    // still sitting in GENERAL is never in the shared `transactions` list —
    // the detail screen needs this as a fallback for that case.
    fetchTransactionById: async (id) => fromRemote(await api.get<RemoteTransaction>(`/transactions/${id}`)),
    integrations,
    setYape: (v) => setIntegrations(prev => ({ ...prev, yape: v })),
    setIzipay: (v) => setIntegrations(prev => ({ ...prev, izipay: v })),
    setPlinBank: (bank, v) => setIntegrations(prev => ({ ...prev, plinBanks: { ...prev.plinBanks, [bank]: v } })),
    preferences,
    setVoiceEnabled: (v) => setPreferences(prev => ({ ...prev, voiceEnabled: v })),
    setPushEnabled: (v) => setPreferences(prev => ({ ...prev, pushEnabled: v })),
    setCaptureActive: (v) => setPreferences(prev => ({ ...prev, captureActive: v })),
  }), [transactions, generalPool, hydrated, transactionsLoading, refreshTransactions, integrations, preferences]);

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

function usePaymentsContext(): PaymentsCtxValue {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error('usePaymentsContext must be used within a PaymentsProvider');
  return ctx;
}

export function useTransactions() {
  const {
    transactions, generalPool, hydrated, transactionsLoading, refreshTransactions, addTransaction, markAllRead,
    routeTransaction, correctAmount, createManualTransaction, fetchTransactionEvents, fetchTransactionById,
  } = usePaymentsContext();
  return {
    transactions, generalPool, hydrated, transactionsLoading, refreshTransactions, addTransaction, markAllRead,
    routeTransaction, correctAmount, createManualTransaction, fetchTransactionEvents, fetchTransactionById,
  };
}

export function useIntegrations() {
  const { integrations, setYape, setIzipay, setPlinBank } = usePaymentsContext();
  return { integrations, setYape, setIzipay, setPlinBank };
}

export function usePreferences() {
  const { preferences, setVoiceEnabled, setPushEnabled, setCaptureActive } = usePaymentsContext();
  return { preferences, setVoiceEnabled, setPushEnabled, setCaptureActive };
}

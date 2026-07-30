import { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../mocks/transactions';
import { api } from '../services/api';
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
  hydrated: boolean;
  transactionsLoading: boolean;
  refreshTransactions: () => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  markAllRead: () => void;
  routeTransaction: (id: string, toStoreId: string | null, version: number) => Promise<Transaction>;
  correctAmount: (id: string, delta: number, reason: string, version: number, confirm: ConfirmationInput) => Promise<Transaction>;
  voidTransaction: (id: string, reason: string, version: number, confirm: ConfirmationInput) => Promise<Transaction>;
  reverseVoid: (id: string, reason: string, version: number) => Promise<Transaction>;
  createManualTransaction: (input: ManualTransactionInput) => Promise<Transaction>;
  fetchGeneralPool: () => Promise<Transaction[]>;
  fetchTransactionEvents: (id: string) => Promise<TransactionEvent[]>;
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

  const refreshTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }
    // Only show the loader on the first real fetch — the 10s background
    // poll below must stay silent, or the indicator would flicker constantly.
    if (!hasLoadedTransactionsOnceRef.current) setTransactionsLoading(true);
    try {
      const remote = await api.get<RemoteTransaction[]>('/transactions');
      setTransactions(remote.map(fromRemote));
    } finally {
      hasLoadedTransactionsOnceRef.current = true;
      setTransactionsLoading(false);
    }
  }, [user]);

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
    hydrated,
    transactionsLoading,
    refreshTransactions,
    addTransaction: async (t) => {
      setTransactions(prev => (
        prev.some(x => x.id === t.id) ? prev : [t, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      ));
      // storeId is deliberately NOT sent — under the GENERAL-pool model the
      // backend always decides unassigned-vs-auto-assign on its own, and any
      // storeId here would be silently ignored server-side anyway.
      const saved = await api.post<RemoteTransaction>('/transactions', {
        payerName: t.payerName,
        payerInitials: t.payerInitials,
        amount: t.amount,
        method: t.method,
        timestamp: t.timestamp.toISOString(),
        reference: t.reference,
        status: t.status,
      });
      setTransactions(prev => prev.map(x => (x.id === t.id ? fromRemote(saved) : x)));
    },
    markAllRead: () => {
      setTransactions(prev => prev.map(t => (t.read ? t : { ...t, read: true })));
      api.post('/transactions/mark-all-read').catch(() => {});
    },
    routeTransaction: async (id, toStoreId, version) => {
      const saved = await api.post<RemoteTransaction>(`/transactions/${id}/route`, { toStoreId, version });
      const updated = fromRemote(saved);
      setTransactions(prev => prev.map(x => (x.id === id ? updated : x)));
      return updated;
    },
    correctAmount: async (id, delta, reason, version, confirm) => {
      const saved = await api.patch<RemoteTransaction>(`/transactions/${id}/correct-amount`, { delta, reason, version, ...confirm });
      const updated = fromRemote(saved);
      setTransactions(prev => prev.map(x => (x.id === id ? updated : x)));
      return updated;
    },
    voidTransaction: async (id, reason, version, confirm) => {
      const saved = await api.post<RemoteTransaction>(`/transactions/${id}/void`, { reason, version, ...confirm });
      const updated = fromRemote(saved);
      setTransactions(prev => prev.map(x => (x.id === id ? updated : x)));
      return updated;
    },
    reverseVoid: async (id, reason, version) => {
      const saved = await api.post<RemoteTransaction>(`/transactions/${id}/void-reverse`, { reason, version });
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
    fetchGeneralPool: async () => {
      const remote = await api.get<RemoteTransaction[]>('/transactions/general');
      return remote.map(fromRemote);
    },
    fetchTransactionEvents: (id) => api.get<TransactionEvent[]>(`/transactions/${id}/events`),
    integrations,
    setYape: (v) => setIntegrations(prev => ({ ...prev, yape: v })),
    setIzipay: (v) => setIntegrations(prev => ({ ...prev, izipay: v })),
    setPlinBank: (bank, v) => setIntegrations(prev => ({ ...prev, plinBanks: { ...prev.plinBanks, [bank]: v } })),
    preferences,
    setVoiceEnabled: (v) => setPreferences(prev => ({ ...prev, voiceEnabled: v })),
    setPushEnabled: (v) => setPreferences(prev => ({ ...prev, pushEnabled: v })),
    setCaptureActive: (v) => setPreferences(prev => ({ ...prev, captureActive: v })),
  }), [transactions, hydrated, transactionsLoading, refreshTransactions, integrations, preferences]);

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

function usePaymentsContext(): PaymentsCtxValue {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error('usePaymentsContext must be used within a PaymentsProvider');
  return ctx;
}

export function useTransactions() {
  const {
    transactions, hydrated, transactionsLoading, refreshTransactions, addTransaction, markAllRead,
    routeTransaction, correctAmount, voidTransaction, reverseVoid, createManualTransaction, fetchGeneralPool, fetchTransactionEvents,
  } = usePaymentsContext();
  return {
    transactions, hydrated, transactionsLoading, refreshTransactions, addTransaction, markAllRead,
    routeTransaction, correctAmount, voidTransaction, reverseVoid, createManualTransaction, fetchGeneralPool, fetchTransactionEvents,
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

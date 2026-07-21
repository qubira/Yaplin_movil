import { createContext, useContext, useEffect, useCallback, useMemo, useState, ReactNode } from 'react';
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
  storeId: string;
  payerName: string;
  payerInitials: string;
  amount: number;
  method: string;
  timestamp: string;
  reference: string;
  status: string;
  read: boolean;
}

function fromRemote(t: RemoteTransaction): Transaction {
  return {
    id: t.id,
    storeId: t.storeId,
    payerName: t.payerName,
    payerInitials: t.payerInitials,
    amount: t.amount,
    method: t.method as Transaction['method'],
    timestamp: new Date(t.timestamp),
    reference: t.reference,
    status: t.status as Transaction['status'],
    read: t.read,
  };
}

interface PaymentsCtxValue {
  transactions: Transaction[];
  hydrated: boolean;
  refreshTransactions: () => Promise<void>;
  addTransaction: (t: Transaction) => Promise<void>;
  removeTransaction: (id: string) => void;
  markAllRead: () => void;
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
      return;
    }
    const remote = await api.get<RemoteTransaction[]>('/transactions');
    setTransactions(remote.map(fromRemote));
  }, [user]);

  useEffect(() => {
    refreshTransactions().catch(() => {});
  }, [refreshTransactions]);

  // Poll so payments captured on other devices/accounts show up without
  // needing to close and reopen the app. Skipped while "Pausar captura" is
  // on, since polling every 10s is the main background battery/data cost.
  useEffect(() => {
    if (!user || !preferences.captureActive) return;
    const interval = setInterval(() => {
      refreshTransactions().catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [user, preferences.captureActive, refreshTransactions]);

  const value = useMemo<PaymentsCtxValue>(() => ({
    transactions,
    hydrated,
    refreshTransactions,
    addTransaction: async (t) => {
      setTransactions(prev => (
        prev.some(x => x.id === t.id) ? prev : [t, ...prev].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      ));
      const saved = await api.post<RemoteTransaction>('/transactions', {
        storeId: t.storeId,
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
    removeTransaction: (id) => {
      setTransactions(prev => prev.filter(t => t.id !== id));
      api.delete(`/transactions/${id}`).catch(() => {});
    },
    markAllRead: () => {
      setTransactions(prev => prev.map(t => (t.read ? t : { ...t, read: true })));
      api.post('/transactions/mark-all-read').catch(() => {});
    },
    integrations,
    setYape: (v) => setIntegrations(prev => ({ ...prev, yape: v })),
    setIzipay: (v) => setIntegrations(prev => ({ ...prev, izipay: v })),
    setPlinBank: (bank, v) => setIntegrations(prev => ({ ...prev, plinBanks: { ...prev.plinBanks, [bank]: v } })),
    preferences,
    setVoiceEnabled: (v) => setPreferences(prev => ({ ...prev, voiceEnabled: v })),
    setPushEnabled: (v) => setPreferences(prev => ({ ...prev, pushEnabled: v })),
    setCaptureActive: (v) => setPreferences(prev => ({ ...prev, captureActive: v })),
  }), [transactions, hydrated, refreshTransactions, integrations, preferences]);

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

function usePaymentsContext(): PaymentsCtxValue {
  const ctx = useContext(PaymentsContext);
  if (!ctx) throw new Error('usePaymentsContext must be used within a PaymentsProvider');
  return ctx;
}

export function useTransactions() {
  const { transactions, hydrated, refreshTransactions, addTransaction, removeTransaction, markAllRead } = usePaymentsContext();
  return { transactions, hydrated, refreshTransactions, addTransaction, removeTransaction, markAllRead };
}

export function useIntegrations() {
  const { integrations, setYape, setIzipay, setPlinBank } = usePaymentsContext();
  return { integrations, setYape, setIzipay, setPlinBank };
}

export function usePreferences() {
  const { preferences, setVoiceEnabled, setPushEnabled, setCaptureActive } = usePaymentsContext();
  return { preferences, setVoiceEnabled, setPushEnabled, setCaptureActive };
}

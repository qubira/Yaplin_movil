import { createContext, useContext, useEffect, useCallback, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Store, TeamMember } from '../mocks/stores';
import { api } from '../services/api';
import { useAuth } from './AuthStore';

const DEFAULT_STORE_KEY = 'yaplin.defaultStoreId.v1';

interface StoresCtxValue {
  stores: Store[];
  hydrated: boolean;
  storesLoading: boolean;
  refreshStores: () => Promise<void>;
  addStore: (store: Omit<Store, 'id'>) => Promise<void>;
  updateStore: (id: string, patch: Partial<Omit<Store, 'id'>>) => Promise<void>;
  removeStore: (id: string) => Promise<void>;
  team: TeamMember[];
  teamLoading: boolean;
  refreshTeam: () => Promise<void>;
  addMember: (member: Omit<TeamMember, 'id' | 'initials'> & { password: string }) => Promise<void>;
  updateMember: (id: string, patch: Partial<Omit<TeamMember, 'id' | 'initials'>> & { password?: string }) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  defaultStoreId: string | null;
  setDefaultStoreId: (id: string) => void;
}

const StoresContext = createContext<StoresCtxValue | null>(null);

export function StoresProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [defaultStoreId, setDefaultStoreIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [storesLoading, setStoresLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(true);
  const hasLoadedStoresOnceRef = useRef(false);
  const hasLoadedTeamOnceRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DEFAULT_STORE_KEY);
        if (raw) setDefaultStoreIdState(JSON.parse(raw));
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (defaultStoreId) AsyncStorage.setItem(DEFAULT_STORE_KEY, JSON.stringify(defaultStoreId)).catch(() => {});
  }, [defaultStoreId, hydrated]);

  const refreshStores = useCallback(async () => {
    if (!user) { setStores([]); setStoresLoading(false); return; }
    if (!hasLoadedStoresOnceRef.current) setStoresLoading(true);
    try {
      const remote = await api.get<Store[]>('/stores');
      setStores(remote);
      setDefaultStoreIdState(prev => (prev && remote.some(s => s.id === prev) ? prev : (remote[0]?.id ?? null)));
    } finally {
      hasLoadedStoresOnceRef.current = true;
      setStoresLoading(false);
    }
  }, [user]);

  const refreshTeam = useCallback(async () => {
    if (!user) { setTeam([]); setTeamLoading(false); return; }
    if (!hasLoadedTeamOnceRef.current) setTeamLoading(true);
    try {
      const remote = await api.get<TeamMember[]>('/team');
      setTeam(remote);
    } finally {
      hasLoadedTeamOnceRef.current = true;
      setTeamLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshStores().catch(() => {}); }, [refreshStores]);
  useEffect(() => { refreshTeam().catch(() => {}); }, [refreshTeam]);

  const value = useMemo<StoresCtxValue>(() => ({
    stores,
    hydrated,
    storesLoading,
    refreshStores,
    addStore: async (store) => {
      await api.post('/stores', store);
      await refreshStores();
    },
    updateStore: async (id, patch) => {
      await api.put(`/stores/${id}`, patch);
      await refreshStores();
    },
    removeStore: async (id) => {
      await api.delete(`/stores/${id}`);
      await refreshStores();
    },
    team,
    teamLoading,
    refreshTeam,
    addMember: async (member) => {
      await api.post('/team', member);
      await refreshTeam();
    },
    updateMember: async (id, patch) => {
      await api.put(`/team/${id}`, patch);
      await refreshTeam();
    },
    removeMember: async (id) => {
      await api.delete(`/team/${id}`);
      await refreshTeam();
    },
    defaultStoreId,
    setDefaultStoreId: setDefaultStoreIdState,
  }), [stores, hydrated, storesLoading, refreshStores, team, teamLoading, refreshTeam, defaultStoreId]);

  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
}

function useStoresContext(): StoresCtxValue {
  const ctx = useContext(StoresContext);
  if (!ctx) throw new Error('useStoresContext must be used within a StoresProvider');
  return ctx;
}

export function useStores() {
  const { stores, hydrated, storesLoading, refreshStores, addStore, updateStore, removeStore } = useStoresContext();
  return { stores, hydrated, storesLoading, refreshStores, addStore, updateStore, removeStore };
}

export function useTeam() {
  const { team, teamLoading, refreshTeam, addMember, updateMember, removeMember } = useStoresContext();
  return { team, teamLoading, refreshTeam, addMember, updateMember, removeMember };
}

export function useDefaultStore() {
  const { defaultStoreId, setDefaultStoreId, stores } = useStoresContext();
  return { defaultStoreId, setDefaultStoreId, stores };
}

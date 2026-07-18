import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, setApiToken } from '../services/api';

const TOKEN_KEY = 'yaplin.auth.token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: 'owner' | 'supervisor' | 'cajero';
  storeId: string | null;
  active: boolean;
  businessId: string;
}

interface AuthCtxValue {
  user: AuthUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { businessName: string; ruc?: string; ownerName: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtxValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setApiToken(token);
          const me = await api.get<AuthUser>('/me');
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        setApiToken(null);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setApiToken(res.token);
    setUser(res.user);
  }

  async function register(data: { businessName: string; ruc?: string; ownerName: string; email: string; password: string }) {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', data);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setApiToken(res.token);
    setUser(res.user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setApiToken(null);
    setUser(null);
  }

  const value = useMemo<AuthCtxValue>(() => ({ user, hydrated, login, register, logout }), [user, hydrated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

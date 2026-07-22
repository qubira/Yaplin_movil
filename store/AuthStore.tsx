import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, setApiToken, setAccountBlockedHandler } from '../services/api';

const TOKEN_KEY = 'yaplin.auth.token';

export interface SubscriptionSummary {
  status: 'trial' | 'active' | 'suspended' | 'expired' | 'cancelled';
  planName: string;
  currentPeriodEnd: string;
  daysRemaining: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: 'owner' | 'supervisor' | 'cajero';
  storeId: string | null;
  active: boolean;
  businessId: string;
  businessName: string;
  subscription?: SubscriptionSummary | null;
}

const REASON_MESSAGES: Record<string, string> = {
  ACCOUNT_SUSPENDED: 'Tu cuenta fue suspendida. Contacta al administrador.',
  ACCOUNT_EXPIRED: 'Tu suscripción venció. Contacta al administrador para renovarla.',
};

interface AuthCtxValue {
  user: AuthUser | null;
  hydrated: boolean;
  logoutReason: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearLogoutReason: () => void;
}

const AuthContext = createContext<AuthCtxValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [logoutReason, setLogoutReason] = useState<string | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setApiToken(null);
    setUser(null);
  }

  useEffect(() => {
    setAccountBlockedHandler((code) => {
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      setApiToken(null);
      setUser(null);
      setLogoutReason(REASON_MESSAGES[code] ?? 'Tu sesión fue cerrada.');
    });
    return () => setAccountBlockedHandler(null);
  }, []);

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

  // Re-check the session periodically while logged in and the app is in the
  // foreground, so a suspension/expiration is noticed even if the user
  // isn't triggering other API calls from a screen.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (!userRef.current) return;
      try {
        const me = await api.get<AuthUser>('/me');
        setUser(me);
      } catch {
        // errors (including account-blocked) are handled by the
        // account-blocked handler / thrown ApiError; nothing else to do here
      }
    }

    function startPolling() {
      if (interval) return;
      interval = setInterval(poll, 60_000);
    }
    function stopPolling() {
      if (interval) clearInterval(interval);
      interval = null;
    }

    if (user) startPolling();
    else stopPolling();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && userRef.current) {
        poll();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      sub.remove();
    };
  }, [user]);

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setApiToken(res.token);
    setUser(res.user);
    setLogoutReason(null);
  }

  const clearLogoutReason = () => setLogoutReason(null);

  const value = useMemo<AuthCtxValue>(
    () => ({ user, hydrated, logoutReason, login, logout, clearLogoutReason }),
    [user, hydrated, logoutReason]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

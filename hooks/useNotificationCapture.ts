import { useEffect, useMemo, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { useTransactions, useIntegrations, usePreferences, PlinBank } from '../store/PaymentsStore';
import { useDefaultStore } from '../store/StoresStore';
import { useAuth } from '../store/AuthStore';
import {
  parseNotification,
  RawNotification,
  YAPE_PACKAGE,
  IZIPAY_PACKAGE,
  PLIN_BANK_PACKAGES,
} from '../services/notificationParser';
import { announcePayment } from '../services/speech';
import { notifyPaymentReceived, requestPushPermission } from '../services/pushNotifications';
import { scheduleSessionExpiryReminder } from '../services/sessionReminder';
import { api } from '../services/api';
import { enqueueOfflineTransaction, getQueuedTransactions, clearOfflineQueue, QueuedTransactionPayload } from '../services/offlineQueue';

function getNativeListener() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-android-notification-listener-service').default;
}

/**
 * Mounts once at the app root. Keeps the native listener's allowed-package
 * list in sync with Settings, and forwards every parsed "payment received"
 * notification into the shared PaymentsStore.
 */
export function useNotificationCapture() {
  const { transactions, addTransaction, refreshTransactions } = useTransactions();
  const { integrations } = useIntegrations();
  const { preferences } = usePreferences();
  const { defaultStoreId } = useDefaultStore();
  const { user } = useAuth();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const voiceEnabledRef = useRef(preferences.voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = preferences.voiceEnabled;
  }, [preferences.voiceEnabled]);

  const pushEnabledRef = useRef(preferences.pushEnabled);
  useEffect(() => {
    pushEnabledRef.current = preferences.pushEnabled;
  }, [preferences.pushEnabled]);

  const captureActiveRef = useRef(preferences.captureActive);
  useEffect(() => {
    captureActiveRef.current = preferences.captureActive;
  }, [preferences.captureActive]);

  const defaultStoreIdRef = useRef(defaultStoreId);
  useEffect(() => {
    defaultStoreIdRef.current = defaultStoreId;
  }, [defaultStoreId]);

  // addTransaction is redefined every ~10s by the background transactions
  // poll in PaymentsStore (it's part of that store's single memoized value,
  // which changes whenever `transactions` does). Reading it through a ref
  // — instead of listing it as this effect's dependency below — keeps the
  // native listener subscription mounted once instead of being torn down
  // and re-added every 10 seconds, which was silently dropping real Yape
  // notifications that arrived during the gap between unsubscribe/resubscribe.
  const addTransactionRef = useRef(addTransaction);
  useEffect(() => {
    addTransactionRef.current = addTransaction;
  }, [addTransaction]);

  // References already registered — used to dedupe the shade-reconciliation
  // pass below against payments the live listener already captured.
  const referencesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    referencesRef.current = new Set(transactions.map(t => t.reference));
  }, [transactions]);

  // Flush any payments that failed to reach the server (no connectivity at
  // capture time) whenever the app comes back to the foreground.
  const refreshRef = useRef(refreshTransactions);
  useEffect(() => {
    refreshRef.current = refreshTransactions;
  }, [refreshTransactions]);

  useEffect(() => {
    async function flushQueue() {
      const queued = await getQueuedTransactions();
      if (queued.length === 0) return;
      let anySucceeded = false;
      const stillPending: QueuedTransactionPayload[] = [];
      for (const payload of queued) {
        try {
          await api.post('/transactions', payload);
          anySucceeded = true;
        } catch {
          stillPending.push(payload);
        }
      }
      if (stillPending.length === 0) await clearOfflineQueue();
      if (anySucceeded) await refreshRef.current().catch(() => {});
    }

    flushQueue();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushQueue();
    });
    return () => subscription.remove();
  }, []);

  // Every time the app opens (or comes back to foreground), reset the 24h
  // "come back and reopen" reminder — see services/sessionReminder.ts.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    async function resetReminder() {
      await requestPushPermission();
      await scheduleSessionExpiryReminder();
    }
    resetReminder();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') resetReminder();
    });
    return () => subscription.remove();
  }, []);

  // Empty package list while paused, or while there's no active (non-suspended,
  // non-expired) session: the native side skips its isPackageAllowed check up
  // front (see ExpoAndroidNotificationListenerService.kt), so notifications
  // never even cross the JS bridge for a blocked account.
  const allowedPackages = useMemo(() => {
    if (Platform.OS !== 'android' || !preferences.captureActive || !user) return [] as string[];
    const packages: string[] = [];
    if (integrations.yape) packages.push(YAPE_PACKAGE);
    if (integrations.izipay) packages.push(IZIPAY_PACKAGE);
    (Object.keys(integrations.plinBanks) as PlinBank[]).forEach(bank => {
      if (integrations.plinBanks[bank]) packages.push(PLIN_BANK_PACKAGES[bank]);
    });
    return packages;
  }, [integrations, preferences.captureActive, user]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      getNativeListener().setAllowedPackages(allowedPackages);
    } catch (e) {
      if (__DEV__) console.log('[YapLin] setAllowedPackages ERROR', String(e));
    }
  }, [allowedPackages]);

  // Shared by the live listener below and the shade-reconciliation pass
  // further down — everything after "we have a parsed transaction with a
  // store" is identical either way.
  const registerTransaction = useRef((transaction: ReturnType<typeof parseNotification>) => {
    if (!transaction) return;
    const storeId = defaultStoreIdRef.current;
    if (!storeId) return;
    transaction.storeId = storeId;

    if (voiceEnabledRef.current) announcePayment(transaction);
    if (pushEnabledRef.current) notifyPaymentReceived(transaction);

    addTransactionRef.current(transaction).catch(() => {
      enqueueOfflineTransaction({
        storeId,
        payerName: transaction.payerName,
        payerInitials: transaction.payerInitials,
        amount: transaction.amount,
        method: transaction.method,
        timestamp: transaction.timestamp.toISOString(),
        reference: transaction.reference,
        status: transaction.status,
      });
    });
  }).current;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      const subscription = getNativeListener().addListener(
        'onNotificationReceived',
        (event: RawNotification) => {
          if (!captureActiveRef.current || !userRef.current) return;
          if (__DEV__) console.log('[YapLin] raw notification:', JSON.stringify(event));
          registerTransaction(parseNotification(event));
        }
      );
      return () => subscription.remove();
    } catch (e) {
      if (__DEV__) console.log('[YapLin] addListener ERROR', String(e));
    }
  }, []);

  // Safety net for when Android kills the listener anyway (some OEMs do
  // this despite stopWithTask="false" + foreground promotion): on every
  // foreground transition, re-read whatever Yape/Plin/Izipay notifications
  // are still sitting in the shade and register any whose reference isn't
  // already in our transaction list. Grouped/collapsed notifications in the
  // shade still carry their own individual text when read this way, so this
  // catches payments even if several arrived stacked under one summary.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    function reconcileFromShade() {
      if (!captureActiveRef.current || !userRef.current) return;
      try {
        const recent: RawNotification[] = getNativeListener().getRecentNotifications();
        recent.forEach((event) => {
          const transaction = parseNotification(event);
          if (!transaction || referencesRef.current.has(transaction.reference)) return;
          if (__DEV__) console.log('[YapLin] backfilling from shade:', JSON.stringify(event));
          registerTransaction(transaction);
        });
      } catch (e) {
        if (__DEV__) console.log('[YapLin] getRecentNotifications ERROR', String(e));
      }
    }

    reconcileFromShade();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcileFromShade();
    });
    return () => subscription.remove();
  }, [registerTransaction]);
}

import { useEffect, useMemo, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { useTransactions, useIntegrations, usePreferences, PlinBank } from '../store/PaymentsStore';
import { useDefaultStore } from '../store/StoresStore';
import {
  parseNotification,
  RawNotification,
  YAPE_PACKAGE,
  IZIPAY_PACKAGE,
  PLIN_BANK_PACKAGES,
} from '../services/notificationParser';
import { announcePayment } from '../services/speech';
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
  const { addTransaction, refreshTransactions } = useTransactions();
  const { integrations } = useIntegrations();
  const { preferences } = usePreferences();
  const { defaultStoreId } = useDefaultStore();

  const voiceEnabledRef = useRef(preferences.voiceEnabled);
  useEffect(() => {
    voiceEnabledRef.current = preferences.voiceEnabled;
  }, [preferences.voiceEnabled]);

  const defaultStoreIdRef = useRef(defaultStoreId);
  useEffect(() => {
    defaultStoreIdRef.current = defaultStoreId;
  }, [defaultStoreId]);

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

  const allowedPackages = useMemo(() => {
    if (Platform.OS !== 'android') return [] as string[];
    const packages: string[] = [];
    if (integrations.yape) packages.push(YAPE_PACKAGE);
    if (integrations.izipay) packages.push(IZIPAY_PACKAGE);
    (Object.keys(integrations.plinBanks) as PlinBank[]).forEach(bank => {
      if (integrations.plinBanks[bank]) packages.push(PLIN_BANK_PACKAGES[bank]);
    });
    return packages;
  }, [integrations]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      getNativeListener().setAllowedPackages(allowedPackages);
    } catch (e) {
      if (__DEV__) console.log('[YapLin] setAllowedPackages ERROR', String(e));
    }
  }, [allowedPackages]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    try {
      const subscription = getNativeListener().addListener(
        'onNotificationReceived',
        (event: RawNotification) => {
          if (__DEV__) console.log('[YapLin] raw notification:', JSON.stringify(event));
          const transaction = parseNotification(event);
          if (!transaction) return;
          const storeId = defaultStoreIdRef.current;
          if (!storeId) return;
          transaction.storeId = storeId;

          if (voiceEnabledRef.current) announcePayment(transaction);

          addTransaction(transaction).catch(() => {
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
        }
      );
      return () => subscription.remove();
    } catch (e) {
      if (__DEV__) console.log('[YapLin] addListener ERROR', String(e));
    }
  }, [addTransaction]);
}

import * as Notifications from 'expo-notifications';
import { Transaction } from '../mocks/transactions';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const METHOD_LABELS: Record<Transaction['method'], string> = { yape: 'Yape', plin: 'Plin', izipay: 'Izipay' };

export async function requestPushPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyPaymentReceived(transaction: Pick<Transaction, 'payerName' | 'amount' | 'method'>): Promise<void> {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const amount = `S/ ${transaction.amount.toFixed(2)}`;
  const title = transaction.payerName === 'Cliente' ? 'Pago recibido' : transaction.payerName;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: `${amount} por ${METHOD_LABELS[transaction.method]}`,
    },
    trigger: null,
  });
}

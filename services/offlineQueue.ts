import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'yaplin.offlineTransactionQueue.v1';

export interface QueuedTransactionPayload {
  storeId: string;
  payerName: string;
  payerInitials: string;
  amount: number;
  method: string;
  timestamp: string;
  reference: string;
  status: string;
}

export async function enqueueOfflineTransaction(payload: QueuedTransactionPayload): Promise<void> {
  const all = await getQueuedTransactions();
  all.push(payload);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(all));
}

export async function getQueuedTransactions(): Promise<QueuedTransactionPayload[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

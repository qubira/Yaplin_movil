import { Transaction } from '../mocks/transactions';

export interface StoreRevenue {
  todayRevenue: number;
  monthRevenue: number;
  txnCount: number;
}

export function computeStoreRevenue(transactions: Transaction[], storeId: string, now: Date = new Date()): StoreRevenue {
  const storeTxns = transactions.filter(t => t.storeId === storeId);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const todayTxns = storeTxns.filter(t => t.timestamp >= todayStart && t.timestamp < todayEnd);
  const monthTxns = storeTxns.filter(t => t.timestamp >= monthStart && t.timestamp < monthEnd);

  return {
    todayRevenue: todayTxns.reduce((sum, t) => sum + t.amount, 0),
    monthRevenue: monthTxns.reduce((sum, t) => sum + t.amount, 0),
    txnCount: todayTxns.length,
  };
}

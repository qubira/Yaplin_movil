export type PaymentMethod = 'yape' | 'plin' | 'izipay';

export interface Transaction {
  id: string;
  payerName: string;
  payerInitials: string;
  amount: number;
  method: PaymentMethod;
  timestamp: Date;
  reference: string;
  status: 'confirmed' | 'pending';
  read?: boolean;
  storeId?: string;
}

const now = new Date();
const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000);
const d = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000);

export const mockTransactions: Transaction[] = [
  { id: 'txn-001', payerName: 'Carlos Mendoza', payerInitials: 'CM', amount: 150.0,  method: 'yape',   timestamp: h(0.3),  reference: 'YP-2024-001', status: 'confirmed' },
  { id: 'txn-002', payerName: 'María García',   payerInitials: 'MG', amount: 45.5,   method: 'plin',   timestamp: h(1),    reference: 'PL-2024-002', status: 'confirmed' },
  { id: 'txn-003', payerName: 'Juan Torres',    payerInitials: 'JT', amount: 320.0,  method: 'yape',   timestamp: h(2),    reference: 'YP-2024-003', status: 'confirmed' },
  { id: 'txn-004', payerName: 'Ana Quispe',     payerInitials: 'AQ', amount: 85.0,   method: 'izipay', timestamp: h(3),    reference: 'IZ-2024-004', status: 'confirmed' },
  { id: 'txn-005', payerName: 'Pedro Villanueva',payerInitials: 'PV', amount: 12.0,   method: 'yape',   timestamp: h(4),    reference: 'YP-2024-005', status: 'confirmed' },
  { id: 'txn-006', payerName: 'Lucía Paredes',  payerInitials: 'LP', amount: 200.0,  method: 'plin',   timestamp: h(5),    reference: 'PL-2024-006', status: 'confirmed' },
  { id: 'txn-007', payerName: 'Roberto Chávez', payerInitials: 'RC', amount: 65.0,   method: 'yape',   timestamp: h(6),    reference: 'YP-2024-007', status: 'confirmed' },
  { id: 'txn-008', payerName: 'Sofía Huanca',   payerInitials: 'SH', amount: 480.0,  method: 'izipay', timestamp: h(8),    reference: 'IZ-2024-008', status: 'confirmed' },
  { id: 'txn-009', payerName: 'Diego Flores',   payerInitials: 'DF', amount: 30.0,   method: 'yape',   timestamp: h(10),   reference: 'YP-2024-009', status: 'confirmed' },
  { id: 'txn-010', payerName: 'Valeria Ríos',   payerInitials: 'VR', amount: 95.0,   method: 'plin',   timestamp: h(12),   reference: 'PL-2024-010', status: 'confirmed' },
  // Historial adicional — Carlos Mendoza
  { id: 'txn-011', payerName: 'Carlos Mendoza', payerInitials: 'CM', amount: 80.0,   method: 'yape',   timestamp: d(1),    reference: 'YP-2024-011', status: 'confirmed' },
  { id: 'txn-012', payerName: 'Carlos Mendoza', payerInitials: 'CM', amount: 220.0,  method: 'plin',   timestamp: d(2),    reference: 'PL-2024-012', status: 'confirmed' },
  { id: 'txn-013', payerName: 'Carlos Mendoza', payerInitials: 'CM', amount: 55.0,   method: 'yape',   timestamp: d(4),    reference: 'YP-2024-013', status: 'confirmed' },
  { id: 'txn-014', payerName: 'Carlos Mendoza', payerInitials: 'CM', amount: 310.0,  method: 'izipay', timestamp: d(7),    reference: 'IZ-2024-014', status: 'confirmed' },
  // Historial adicional — María García
  { id: 'txn-015', payerName: 'María García',   payerInitials: 'MG', amount: 120.0,  method: 'plin',   timestamp: d(1),    reference: 'PL-2024-015', status: 'confirmed' },
  { id: 'txn-016', payerName: 'María García',   payerInitials: 'MG', amount: 67.5,   method: 'yape',   timestamp: d(3),    reference: 'YP-2024-016', status: 'confirmed' },
  // Historial adicional — Juan Torres
  { id: 'txn-017', payerName: 'Juan Torres',    payerInitials: 'JT', amount: 500.0,  method: 'izipay', timestamp: d(2),    reference: 'IZ-2024-017', status: 'confirmed' },
  { id: 'txn-018', payerName: 'Juan Torres',    payerInitials: 'JT', amount: 145.0,  method: 'yape',   timestamp: d(5),    reference: 'YP-2024-018', status: 'confirmed' },
];

export function formatAmount(amount: number): string {
  return `S/ ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const totalToday = mockTransactions
  .filter((t) => (now.getTime() - t.timestamp.getTime()) < 86400000)
  .reduce((sum, t) => sum + t.amount, 0);

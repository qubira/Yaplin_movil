import * as Speech from 'expo-speech';
import { Transaction } from '../mocks/transactions';

const METHOD_VERB: Record<Transaction['method'], string> = {
  yape: 'yapeó',
  plin: 'te plineó',
  izipay: 'pagó con Izipay',
};

function spokenAmount(amount: number): string {
  const soles = Math.floor(amount);
  const centavos = Math.round((amount - soles) * 100);
  if (centavos === 0) return `${soles} soles`;
  return `${soles} soles con ${centavos} céntimos`;
}

export function buildSpokenMessage(transaction: Pick<Transaction, 'payerName' | 'amount' | 'method'>): string {
  const verb = METHOD_VERB[transaction.method];
  const amount = spokenAmount(transaction.amount);
  if (!transaction.payerName || transaction.payerName === 'Cliente') {
    return `Se ${verb} ${amount}`;
  }
  return `${transaction.payerName} ${verb} ${amount}`;
}

export function announcePayment(transaction: Pick<Transaction, 'payerName' | 'amount' | 'method'>) {
  Speech.speak(buildSpokenMessage(transaction), { language: 'es-419' });
}

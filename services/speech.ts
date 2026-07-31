import * as Speech from 'expo-speech';
import { Transaction } from '../mocks/transactions';

const METHOD_VERB: Record<Transaction['method'], string> = {
  yape: 'yapeó',
  plin: 'te plineó',
  izipay: 'pagó con Izipay',
  manual: 'registró un pago',
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
  const message = buildSpokenMessage(transaction);
  Speech.speak(message, {
    language: 'es-419',
    // Some Android TTS engines/OEM builds don't have the es-419 (Latin
    // America) voice pack downloaded and fail silently instead of falling
    // back on their own — retry once with a bare 'es' so the device's
    // default Spanish voice gets a chance instead of the alert just never
    // being heard. onError only fires for a genuine synthesis failure, not
    // for e.g. audio focus loss, so a single retry here is safe.
    onError: () => {
      if (__DEV__) console.log('[YapLin] Speech.speak es-419 ERROR, retrying with es');
      try {
        Speech.speak(message, { language: 'es' });
      } catch (e) {
        if (__DEV__) console.log('[YapLin] Speech.speak es fallback ERROR', String(e));
      }
    },
  });
}

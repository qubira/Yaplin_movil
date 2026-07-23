import { PaymentMethod, Transaction } from '../mocks/transactions';
import { PlinBank } from '../store/PaymentsStore';

// Shape of the event emitted by expo-android-notification-listener-service.
// Declared locally (instead of importing from the package) so this file never
// forces the native module to be evaluated on platforms where it isn't linked.
export interface RawNotification {
  packageName: string;
  title?: string;
  text?: string;
  postTime?: number;
  bigText?: string;
  subText?: string;
  summaryText?: string;
}

export const YAPE_PACKAGE = 'com.bcp.innovacxion.yapeapp';
export const IZIPAY_PACKAGE = 'pe.izipay.apps.izipay';

export const PLIN_BANK_PACKAGES: Record<PlinBank, string> = {
  bbva: 'com.bbva.nxt_peru',
  interbank: 'pe.com.interbank.mobilebanking',
  scotiabank: 'pe.com.scotiabank.blpm.android.client',
};

interface PackageInfo {
  method: PaymentMethod;
  bank?: PlinBank;
}

export const PACKAGE_TO_INFO: Record<string, PackageInfo> = {
  [YAPE_PACKAGE]: { method: 'yape' },
  [IZIPAY_PACKAGE]: { method: 'izipay' },
  [PLIN_BANK_PACKAGES.bbva]: { method: 'plin', bank: 'bbva' },
  [PLIN_BANK_PACKAGES.interbank]: { method: 'plin', bank: 'interbank' },
  [PLIN_BANK_PACKAGES.scotiabank]: { method: 'plin', bank: 'scotiabank' },
};

// Only treat a notification as a received payment if its text hints at money
// coming IN — this filters out outgoing transfers, promos, balance summaries, etc.
// Interbank's Plin notifications use "te ha plineado" (present perfect) instead
// of the simple-past verbs Yape uses, hence the separate plin(...) branch.
const INCOMING_HINTS = /recib|te\s+(?:ha\s+)?(?:envi[oó]|pag[oó]|transfiri[oó]|yape[oó]|plin(?:e[oó]|eado))/i;

const AMOUNT_RE = /S\s*\/\.?\s*([\d]{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i;

// Yape masks partial surnames with a trailing "*" (e.g. "Melani Loy* te envió...") —
// the optional \*? after the name tolerates that without swallowing it into the name.
const NAME_BEFORE_VERB_RE =
  /([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'’.]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'’.]*){0,3})\*?\s+te\s+(?:ha\s+)?(?:envió|pagó|transfirió|yapeó|plineó|plineado)/i;

const NAME_AFTER_DE_RE =
  /\bde\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'’.]*(?:\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ'’.]*){0,3})/;

// Real Yape "payment received" text ends with "El cód. de seguridad es: 373" — a
// genuine, unique code, far better as `reference` than a synthetic timestamp id.
const SECURITY_CODE_RE = /c[oó]d(?:\.|igo)?\s+de\s+seguridad\s+es:?\s*(\d+)/i;

const GENERIC_APP_TITLES = new Set(['yape', 'plin', 'izipay', 'bbva', 'interbank', 'scotiabank', 'app']);

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function parseAmount(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Some banks (e.g. Interbank) don't include a security code in the notification
// text, and also post the same payment twice under different channels/titles
// ("Interbank" and "Negocios") a few hundred ms apart. Bucketing by minute
// instead of using the raw timestamp makes both copies produce the same
// reference, so the existing reference-based dedup collapses them into one.
function fallbackReference(methodTag: string, payerName: string, amount: number, timestamp: Date): string {
  const minuteBucket = Math.floor(timestamp.getTime() / 60000);
  const slug = payerName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${methodTag.toUpperCase()}-${slug}-${Math.round(amount * 100)}-${minuteBucket}`;
}

function extractPayerName(fullText: string, title?: string): string {
  const byVerb = fullText.match(NAME_BEFORE_VERB_RE);
  if (byVerb) return byVerb[1].trim();

  const byDe = fullText.match(NAME_AFTER_DE_RE);
  if (byDe) return byDe[1].trim();

  if (title && !GENERIC_APP_TITLES.has(title.trim().toLowerCase())) {
    return title.trim();
  }

  return 'Cliente';
}

/**
 * Best-effort parser: exact wording from Yape/BBVA/Interbank/Scotiabank/Izipay
 * "payment received" notifications isn't confirmed yet. Unmatched formats are
 * skipped (return null) rather than guessed — log the raw event in dev to tune
 * the regexes above once real notification text is observed on-device.
 */
export function parseNotification(data: RawNotification): Transaction | null {
  const info = PACKAGE_TO_INFO[data.packageName];
  if (!info) return null;

  const fullText = [data.title, data.text, data.bigText, data.subText, data.summaryText]
    .filter(Boolean)
    .join(' — ');

  if (!INCOMING_HINTS.test(fullText)) return null;

  const amountMatch = fullText.match(AMOUNT_RE);
  if (!amountMatch) return null;

  const amount = parseAmount(amountMatch[1]);
  if (amount === null) return null;

  const payerName = extractPayerName(fullText, data.title);
  const timestamp = data.postTime ? new Date(data.postTime) : new Date();
  const methodTag = info.bank ? `${info.method}-${info.bank}` : info.method;
  const securityCode = fullText.match(SECURITY_CODE_RE)?.[1];

  return {
    id: `${data.packageName}-${timestamp.getTime()}-${Math.round(amount * 100)}`,
    payerName,
    payerInitials: initialsOf(payerName),
    amount,
    method: info.method,
    timestamp,
    reference: securityCode ?? fallbackReference(methodTag, payerName, amount, timestamp),
    status: 'confirmed',
    read: false,
  };
}

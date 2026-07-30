import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { IntentEventType, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { AuthContext, requireAuth } from '../auth';
import { requestIp } from '../audit';
import { logBlockedIntent, requireOwnerLogged } from '../security';
import { isArchived, isTimestampInLimaToday, limaTodayRange, limaWindowStart } from '../limaTime';

const router = Router();
router.use(requireAuth);

const CONFIRM_TEXT = 'CONFIRMAR';

function toPublic(t: { amount: unknown; originalAmount: unknown; [key: string]: unknown }) {
  return { ...t, amount: Number(t.amount), originalAmount: Number(t.originalAmount) };
}

function toPublicEvent(e: { seq: bigint; [key: string]: unknown }) {
  return { ...e, seq: Number(e.seq) };
}

// Decides whether `auth` may move a transaction from `fromStoreId` to
// `toStoreId`, per the permission matrix in the plan. Owner: unrestricted.
// Supervisor: their store must be the origin or the destination (or they
// oversee all stores, storeId === null) and it must be today's payment.
// Cajero: only GENERAL -> their own store, and only today's payment.
function canRoute(
  auth: AuthContext,
  fromStoreId: string | null,
  toStoreId: string | null,
  timestamp: Date
): { allowed: true } | { allowed: false; eventType: IntentEventType } {
  if (auth.role === 'owner') return { allowed: true };

  const sameDay = isTimestampInLimaToday(timestamp);

  if (auth.role === 'supervisor') {
    const scopeOk = auth.storeId === null || auth.storeId === fromStoreId || auth.storeId === toStoreId;
    if (!scopeOk) return { allowed: false, eventType: 'BLOCKED_STORE_ACCESS' };
    if (!sameDay) return { allowed: false, eventType: 'BLOCKED_ROLE_ACTION' };
    return { allowed: true };
  }

  // cajero: must come FROM general, and go straight to their own store.
  const scopeOk = fromStoreId === null && toStoreId === auth.storeId;
  if (!scopeOk) return { allowed: false, eventType: 'BLOCKED_STORE_ACCESS' };
  if (!sameDay) return { allowed: false, eventType: 'BLOCKED_ROLE_ACTION' };
  return { allowed: true };
}

interface ConfirmationParams {
  auth: AuthContext;
  confirmPin?: unknown;
  confirmText?: unknown;
  ip: string | null;
  userAgent: string | null;
}

type ConfirmationResult = { ok: true } | { ok: false; status: number; body: Record<string, unknown> };

// Shared double-confirmation gate for money-affecting actions (correct-amount,
// void): PIN if the owner configured one (confirmText is then ignored even if
// sent, so the PIN actually protects something), otherwise an exact
// "CONFIRMAR" text match. A wrong confirmation is itself logged as an intent.
async function verifyConfirmation(params: ConfirmationParams): Promise<ConfirmationResult> {
  const user = await prisma.user.findUnique({ where: { id: params.auth.userId } });
  if (!user) return { ok: false, status: 401, body: { error: 'No autorizado' } };

  if (user.transactionPinHash) {
    if (typeof params.confirmPin !== 'string' || params.confirmPin.length === 0) {
      return {
        ok: false,
        status: 400,
        body: { error: 'Se requiere el PIN para confirmar.', code: 'CONFIRMATION_REQUIRED' },
      };
    }
    const valid = await bcrypt.compare(params.confirmPin, user.transactionPinHash);
    if (!valid) {
      await logBlockedIntent({
        businessId: params.auth.businessId,
        userId: params.auth.userId,
        actorEmail: params.auth.email,
        eventType: 'WRONG_CONFIRMATION',
        severity: 'medium',
        detail: { method: 'pin' },
        ipAddress: params.ip,
        userAgent: params.userAgent,
      });
      return { ok: false, status: 401, body: { error: 'PIN incorrecto.', code: 'CONFIRMATION_INVALID' } };
    }
    return { ok: true };
  }

  if (typeof params.confirmText !== 'string' || params.confirmText.length === 0) {
    return {
      ok: false,
      status: 400,
      body: { error: `Escribe "${CONFIRM_TEXT}" para confirmar.`, code: 'CONFIRMATION_REQUIRED' },
    };
  }
  if (params.confirmText !== CONFIRM_TEXT) {
    await logBlockedIntent({
      businessId: params.auth.businessId,
      userId: params.auth.userId,
      actorEmail: params.auth.email,
      eventType: 'WRONG_CONFIRMATION',
      severity: 'medium',
      detail: { method: 'text' },
      ipAddress: params.ip,
      userAgent: params.userAgent,
    });
    return { ok: false, status: 401, body: { error: 'Texto de confirmación incorrecto.', code: 'CONFIRMATION_INVALID' } };
  }
  return { ok: true };
}

// GET /transactions — already-assigned, confirmed payments only. Per the
// visibility rules in the spec: cajero only sees today (America/Lima);
// supervisor sees up to the last 3 months; owner is unrestricted.
router.get('/', async (req, res) => {
  const { role, storeId, businessId } = req.auth!;
  const where: Prisma.TransactionWhereInput = { businessId, status: 'confirmed', storeId: { not: null } };
  if (role !== 'owner' && storeId) where.storeId = storeId;

  if (role === 'cajero') {
    const { start, end } = limaTodayRange();
    where.timestamp = { gte: start, lt: end };
  } else if (role === 'supervisor') {
    where.timestamp = { gte: limaWindowStart(90) };
  }

  const transactions = await prisma.transaction.findMany({ where, orderBy: { timestamp: 'desc' } });
  res.json(transactions.map(toPublic));
});

// GET /transactions/general — the unassigned GENERAL pool. Owner sees all of
// it; cajero/supervisor are limited to today's payments (America/Lima).
router.get('/general', async (req, res) => {
  const { role, businessId } = req.auth!;
  const where: Prisma.TransactionWhereInput = { businessId, storeId: null, status: 'confirmed' };
  if (role !== 'owner') {
    const { start, end } = limaTodayRange();
    where.timestamp = { gte: start, lt: end };
  }

  const transactions = await prisma.transaction.findMany({ where, orderBy: { timestamp: 'desc' } });
  res.json(transactions.map(toPublic));
});

// Whether `auth` may view `txn` at all — matches the union of what GET / and
// GET /general already expose, so anything reachable from either list is
// also individually fetchable by its own id. Without this, opening the
// detail screen for a payment still sitting in GENERAL (storeId: null)
// would 404, since GET / explicitly excludes unassigned payments — the
// detail screen needs its own broader check, not the list's narrower one.
function canViewTransaction(
  auth: { role: 'owner' | 'supervisor' | 'cajero'; storeId: string | null },
  txn: { storeId: string | null; timestamp: Date }
): boolean {
  if (auth.role === 'owner') return true;
  const withinWindow = auth.role === 'cajero' ? isTimestampInLimaToday(txn.timestamp) : txn.timestamp >= limaWindowStart(90);
  if (!withinWindow) return false;
  if (txn.storeId === null) return true; // GENERAL is visible to everyone within their window
  return auth.storeId === null || auth.storeId === txn.storeId;
}

// GET /transactions/:id — single-payment fetch, used by the mobile detail
// screen. Broader visibility than GET / on purpose (see canViewTransaction).
router.get('/:id', async (req, res) => {
  const auth = req.auth!;
  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, businessId: auth.businessId } });
  if (!txn || !canViewTransaction(auth, txn)) return res.status(404).json({ error: 'Pago no encontrado' });
  res.json(toPublic(txn));
});

// POST /transactions — automatic notification capture (Yape/Plin/Izipay),
// called by the mobile app's listener for every payment it reads off the
// device. Under the GENERAL-pool model this ALWAYS lands unassigned
// (storeId: null) and gets routed by staff afterward — any `storeId` an
// older, not-yet-updated mobile client still sends is deliberately ignored,
// except for the single-store shortcut: a business with exactly one active
// store has no real ambiguity to triage, so it's auto-assigned directly.
router.post('/', async (req, res) => {
  const auth = req.auth!;
  const { payerName, payerInitials, amount, method, timestamp, reference, status } = req.body ?? {};

  if (!payerName || amount === undefined || !method || !reference) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const activeStores = await prisma.store.findMany({
    where: { businessId: auth.businessId, status: 'active' },
    select: { id: true },
  });
  const autoStoreId = activeStores.length === 1 ? activeStores[0].id : null;

  const amountDecimal = new Prisma.Decimal(amount);
  const ts = timestamp ? new Date(timestamp) : new Date();

  const created = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        businessId: auth.businessId,
        storeId: autoStoreId,
        payerName,
        payerInitials: payerInitials ?? '',
        originalAmount: amountDecimal,
        amount: amountDecimal,
        method,
        timestamp: ts,
        reference,
        status: status === 'voided' ? 'voided' : 'confirmed',
        read: false,
        source: 'auto',
        version: 0,
      },
    });

    await tx.transactionEvent.create({
      data: {
        transactionId: txn.id,
        type: 'CAPTURED',
        payload: {
          storeId: txn.storeId,
          payerName: txn.payerName,
          amount: txn.amount.toString(),
          method: txn.method,
          reference: txn.reference,
          timestamp: txn.timestamp.toISOString(),
        },
        actorId: null,
        actorName: 'Sistema',
        actorRole: 'system',
      },
    });

    return txn;
  });

  res.status(201).json(toPublic(created));
});

router.post('/mark-all-read', async (req, res) => {
  await prisma.transaction.updateMany({
    where: { businessId: req.auth!.businessId, read: false },
    data: { read: true },
  });
  res.status(204).send();
});

// `read` is inbox state, not a financial fact — it stays a plain projection
// update and never becomes a TransactionEvent.
router.patch('/:id', async (req, res) => {
  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });

  const { read } = req.body ?? {};
  const updated = await prisma.transaction.update({
    where: { id: txn.id },
    data: { ...(read !== undefined && { read }) },
  });
  res.json(toPublic(updated));
});

// POST /transactions/:id/route — GENERAL<->tienda or tienda<->tienda.
router.post('/:id/route', async (req, res) => {
  const auth = req.auth!;
  const { toStoreId, version } = req.body ?? {};
  const ip = requestIp(req);
  const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;

  if (toStoreId !== null && typeof toStoreId !== 'string') {
    return res.status(400).json({ error: 'toStoreId inválido' });
  }
  if (typeof version !== 'number') {
    return res.status(400).json({ error: 'version es requerida' });
  }

  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, businessId: auth.businessId } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });

  if (txn.status === 'voided') return res.status(409).json({ error: 'El pago está anulado.', code: 'VOIDED' });
  if (isArchived(txn.timestamp)) {
    return res.status(409).json({ error: 'Este pago pertenece a un año archivado (solo lectura).', code: 'ARCHIVED' });
  }

  const permission = canRoute(auth, txn.storeId, toStoreId, txn.timestamp);
  if (!permission.allowed) {
    await logBlockedIntent({
      businessId: auth.businessId,
      userId: auth.userId,
      actorEmail: auth.email,
      eventType: permission.eventType,
      severity: 'medium',
      detail: { transactionId: txn.id, fromStoreId: txn.storeId, toStoreId },
      ipAddress: ip,
      userAgent,
    });
    return res.status(403).json({ error: 'No tienes permiso para mover este pago.' });
  }

  if (toStoreId !== null) {
    const destStore = await prisma.store.findFirst({ where: { id: toStoreId, businessId: auth.businessId } });
    if (!destStore) return res.status(404).json({ error: 'Tienda destino no encontrada' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.transaction.findFirst({ where: { id: txn.id, businessId: auth.businessId } });
    if (!before) return { notFound: true } as const;
    if (before.status === 'voided') return { voided: true } as const;

    const updateResult = await tx.transaction.updateMany({
      where: { id: before.id, version },
      data: { storeId: toStoreId, version: { increment: 1 } },
    });
    if (updateResult.count === 0) return { conflict: true } as const;

    await tx.transactionEvent.create({
      data: {
        transactionId: before.id,
        type: toStoreId === null ? 'RETURNED_TO_GENERAL' : 'ASSIGNED',
        payload: { fromStoreId: before.storeId, toStoreId },
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
      },
    });

    return { transaction: await tx.transaction.findUniqueOrThrow({ where: { id: before.id } }) } as const;
  });

  if ('notFound' in result) return res.status(404).json({ error: 'Pago no encontrado' });
  if ('voided' in result) return res.status(409).json({ error: 'El pago está anulado.', code: 'VOIDED' });
  if ('conflict' in result) {
    return res.status(409).json({ error: 'La versión del pago cambió, refresca e intenta de nuevo.', code: 'VERSION_CONFLICT' });
  }
  res.json(toPublic(result.transaction));
});

// PATCH /transactions/:id/correct-amount — owner only, double-confirmed,
// blocked on voided/archived payments. Arithmetic always via Prisma.Decimal.
router.patch('/:id/correct-amount', requireOwnerLogged('CORRECT_AMOUNT'), async (req, res) => {
  const auth = req.auth!;
  const { delta, reason, version, confirmPin, confirmText } = req.body ?? {};

  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) {
    return res.status(400).json({ error: 'delta inválido' });
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({ error: 'reason es requerido' });
  }
  if (typeof version !== 'number') {
    return res.status(400).json({ error: 'version es requerida' });
  }

  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, businessId: auth.businessId } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });
  if (txn.status === 'voided') return res.status(409).json({ error: 'El pago está anulado.', code: 'VOIDED' });
  if (isArchived(txn.timestamp)) {
    return res.status(409).json({ error: 'Este pago pertenece a un año archivado (solo lectura).', code: 'ARCHIVED' });
  }

  const confirmation = await verifyConfirmation({
    auth,
    confirmPin,
    confirmText,
    ip: requestIp(req),
    userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
  });
  if (!confirmation.ok) return res.status(confirmation.status).json(confirmation.body);

  const deltaDecimal = new Prisma.Decimal(delta);

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.transaction.findFirst({ where: { id: txn.id, businessId: auth.businessId } });
    if (!before) return { notFound: true } as const;
    if (before.status === 'voided') return { voided: true } as const;

    const newAmount = before.amount.add(deltaDecimal);

    const updateResult = await tx.transaction.updateMany({
      where: { id: before.id, version },
      data: { amount: newAmount, version: { increment: 1 } },
    });
    if (updateResult.count === 0) return { conflict: true } as const;

    await tx.transactionEvent.create({
      data: {
        transactionId: before.id,
        type: 'AMOUNT_CORRECTED',
        payload: {
          delta,
          reason,
          previousAmount: before.amount.toString(),
          newAmount: newAmount.toString(),
        },
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
      },
    });

    return { transaction: await tx.transaction.findUniqueOrThrow({ where: { id: before.id } }) } as const;
  });

  if ('notFound' in result) return res.status(404).json({ error: 'Pago no encontrado' });
  if ('voided' in result) return res.status(409).json({ error: 'El pago está anulado.', code: 'VOIDED' });
  if ('conflict' in result) {
    return res.status(409).json({ error: 'La versión del pago cambió, refresca e intenta de nuevo.', code: 'VERSION_CONFLICT' });
  }
  res.json(toPublic(result.transaction));
});

// POST /transactions/manual — owner enters a payment by hand.
router.post('/manual', requireOwnerLogged('MANUAL_CREATE'), async (req, res) => {
  const auth = req.auth!;
  const { storeId, amount, payerName, notes, method, timestamp } = req.body ?? {};

  if (typeof storeId !== 'string' || storeId.length === 0) {
    return res.status(400).json({ error: 'storeId es requerido' });
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'amount inválido' });
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, businessId: auth.businessId } });
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  const amountDecimal = new Prisma.Decimal(amount);
  const ts = timestamp ? new Date(timestamp) : new Date();

  const created = await prisma.$transaction(async (tx) => {
    const txn = await tx.transaction.create({
      data: {
        businessId: auth.businessId,
        storeId,
        payerName: typeof payerName === 'string' && payerName.length > 0 ? payerName : 'Ingreso manual',
        payerInitials: '',
        originalAmount: amountDecimal,
        amount: amountDecimal,
        method: typeof method === 'string' && method.length > 0 ? method : 'manual',
        timestamp: ts,
        reference: '',
        status: 'confirmed',
        read: false,
        source: 'manual',
        version: 0,
      },
    });

    await tx.transactionEvent.create({
      data: {
        transactionId: txn.id,
        type: 'MANUAL_CREATED',
        payload: {
          storeId: txn.storeId,
          payerName: txn.payerName,
          originalAmount: txn.originalAmount.toString(),
          amount: txn.amount.toString(),
          method: txn.method,
          timestamp: txn.timestamp.toISOString(),
          notes: typeof notes === 'string' && notes.length > 0 ? notes : null,
        },
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
      },
    });

    return txn;
  });

  res.status(201).json(toPublic(created));
});

// POST /transactions/:id/void — owner only, double-confirmed. Replaces the
// old physical DELETE, which had no role check at all.
router.post('/:id/void', requireOwnerLogged('VOID'), async (req, res) => {
  const auth = req.auth!;
  const { reason, version, confirmPin, confirmText } = req.body ?? {};

  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({ error: 'reason es requerido' });
  }
  if (typeof version !== 'number') {
    return res.status(400).json({ error: 'version es requerida' });
  }

  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, businessId: auth.businessId } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });
  if (txn.status === 'voided') return res.status(409).json({ error: 'El pago ya está anulado.', code: 'ALREADY_VOIDED' });
  if (isArchived(txn.timestamp)) {
    return res.status(409).json({ error: 'Este pago pertenece a un año archivado (solo lectura).', code: 'ARCHIVED' });
  }

  const confirmation = await verifyConfirmation({
    auth,
    confirmPin,
    confirmText,
    ip: requestIp(req),
    userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
  });
  if (!confirmation.ok) return res.status(confirmation.status).json(confirmation.body);

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.transaction.findFirst({ where: { id: txn.id, businessId: auth.businessId } });
    if (!before) return { notFound: true } as const;
    if (before.status === 'voided') return { alreadyVoided: true } as const;

    const updateResult = await tx.transaction.updateMany({
      where: { id: before.id, version },
      data: { status: 'voided', version: { increment: 1 } },
    });
    if (updateResult.count === 0) return { conflict: true } as const;

    await tx.transactionEvent.create({
      data: {
        transactionId: before.id,
        type: 'VOIDED',
        payload: { reason },
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
      },
    });

    return { transaction: await tx.transaction.findUniqueOrThrow({ where: { id: before.id } }) } as const;
  });

  if ('notFound' in result) return res.status(404).json({ error: 'Pago no encontrado' });
  if ('alreadyVoided' in result) return res.status(409).json({ error: 'El pago ya está anulado.', code: 'ALREADY_VOIDED' });
  if ('conflict' in result) {
    return res.status(409).json({ error: 'La versión del pago cambió, refresca e intenta de nuevo.', code: 'VERSION_CONFLICT' });
  }
  res.json(toPublic(result.transaction));
});

// POST /transactions/:id/void-reverse — owner only. A new event, never edits
// the original VOIDED row. Not money-affecting by itself, so it does not
// require the PIN/CONFIRMAR gate — but it is still blocked on archived years,
// same as VOIDED, since it rewrites the payment's active/voided history.
router.post('/:id/void-reverse', requireOwnerLogged('VOID_REVERSE'), async (req, res) => {
  const auth = req.auth!;
  const { reason, version } = req.body ?? {};

  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return res.status(400).json({ error: 'reason es requerido' });
  }
  if (typeof version !== 'number') {
    return res.status(400).json({ error: 'version es requerida' });
  }

  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, businessId: auth.businessId } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });
  if (txn.status !== 'voided') return res.status(409).json({ error: 'El pago no está anulado.', code: 'NOT_VOIDED' });
  if (isArchived(txn.timestamp)) {
    return res.status(409).json({ error: 'Este pago pertenece a un año archivado (solo lectura).', code: 'ARCHIVED' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const before = await tx.transaction.findFirst({ where: { id: txn.id, businessId: auth.businessId } });
    if (!before) return { notFound: true } as const;
    if (before.status !== 'voided') return { notVoided: true } as const;

    const updateResult = await tx.transaction.updateMany({
      where: { id: before.id, version },
      data: { status: 'confirmed', version: { increment: 1 } },
    });
    if (updateResult.count === 0) return { conflict: true } as const;

    await tx.transactionEvent.create({
      data: {
        transactionId: before.id,
        type: 'VOID_REVERSED',
        payload: { reason },
        actorId: auth.userId,
        actorName: auth.name,
        actorRole: auth.role,
      },
    });

    return { transaction: await tx.transaction.findUniqueOrThrow({ where: { id: before.id } }) } as const;
  });

  if ('notFound' in result) return res.status(404).json({ error: 'Pago no encontrado' });
  if ('notVoided' in result) return res.status(409).json({ error: 'El pago no está anulado.', code: 'NOT_VOIDED' });
  if ('conflict' in result) {
    return res.status(409).json({ error: 'La versión del pago cambió, refresca e intenta de nuevo.', code: 'VERSION_CONFLICT' });
  }
  res.json(toPublic(result.transaction));
});

// GET /transactions/:id/events — full immutable timeline, oldest first.
router.get('/:id/events', async (req, res) => {
  const auth = req.auth!;
  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, businessId: auth.businessId } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });

  if (auth.role !== 'owner' && auth.storeId) {
    const visible = txn.storeId === auth.storeId || (txn.storeId === null && isTimestampInLimaToday(txn.timestamp));
    if (!visible) {
      await logBlockedIntent({
        businessId: auth.businessId,
        userId: auth.userId,
        actorEmail: auth.email,
        eventType: 'BLOCKED_STORE_ACCESS',
        severity: 'low',
        detail: { transactionId: txn.id },
        ipAddress: requestIp(req),
        userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
      });
      return res.status(403).json({ error: 'No tienes acceso a este pago.' });
    }
  }

  const events = await prisma.transactionEvent.findMany({
    where: { transactionId: txn.id },
    orderBy: { seq: 'asc' },
  });
  res.json(events.map(toPublicEvent));
});

export default router;

import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../auth';
import { AUDIT_ORIGIN, requestIp, writeAuditLog } from '../audit';

const router = Router();
router.use(requireAuth);

function toPublic(t: { amount: unknown; [key: string]: unknown }) {
  return { ...t, amount: Number(t.amount) };
}

router.get('/', async (req, res) => {
  const { role, storeId, businessId } = req.auth!;
  const where: Record<string, unknown> = { store: { businessId } };
  if (role !== 'owner' && storeId) where.storeId = storeId;

  const transactions = await prisma.transaction.findMany({ where, orderBy: { timestamp: 'desc' } });
  res.json(transactions.map(toPublic));
});

router.post('/', async (req, res) => {
  const { storeId, payerName, payerInitials, amount, method, timestamp, reference, status } = req.body ?? {};
  if (!storeId || !payerName || amount === undefined || !method || !reference) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const store = await prisma.store.findFirst({ where: { id: storeId, businessId: req.auth!.businessId } });
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  const txn = await prisma.transaction.create({
    data: {
      storeId,
      payerName,
      payerInitials: payerInitials ?? '',
      amount,
      method,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      reference,
      status: status ?? 'confirmed',
      read: false,
    },
  });
  res.status(201).json(toPublic(txn));
});

router.post('/mark-all-read', async (req, res) => {
  await prisma.transaction.updateMany({
    where: { store: { businessId: req.auth!.businessId }, read: false },
    data: { read: true },
  });
  res.status(204).send();
});

router.patch('/:id', async (req, res) => {
  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, store: { businessId: req.auth!.businessId } } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });

  const { read } = req.body ?? {};
  const updated = await prisma.transaction.update({ where: { id: txn.id }, data: { ...(read !== undefined && { read }) } });
  res.json(toPublic(updated));
});

router.delete('/:id', async (req, res) => {
  const notFound = await prisma
    .$transaction(async (tx) => {
      // Read, capture in the audit log, then delete — all inside one
      // transaction so the audited data is exactly what got removed, and
      // a failure anywhere rolls back the whole operation (nothing is
      // deleted without being audited, and nothing is audited without
      // actually being deleted).
      const txn = await tx.transaction.findFirst({
        where: { id: req.params.id, store: { businessId: req.auth!.businessId } },
      });
      if (!txn) return true;

      await writeAuditLog(tx, {
        actorEmail: req.auth!.email,
        action: 'DELETE',
        entityType: 'Transaction',
        entityId: txn.id,
        businessId: req.auth!.businessId,
        summary: `${req.auth!.email} eliminó un pago de ${txn.payerName} por S/ ${Number(txn.amount).toFixed(2)} (${txn.method}, ref. ${txn.reference}).`,
        changes: { deleted: { old: toPublic(txn), new: null } },
        origin: AUDIT_ORIGIN.MOBILE,
        ipAddress: requestIp(req),
        userAgent: req.headers['user-agent'] ?? null,
      });

      await tx.transaction.delete({ where: { id: txn.id } });
      return false;
    });

  if (notFound) return res.status(404).json({ error: 'Pago no encontrado' });
  res.status(204).send();
});

export default router;

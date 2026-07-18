import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../auth';

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
  const txn = await prisma.transaction.findFirst({ where: { id: req.params.id, store: { businessId: req.auth!.businessId } } });
  if (!txn) return res.status(404).json({ error: 'Pago no encontrado' });

  await prisma.transaction.delete({ where: { id: txn.id } });
  res.status(204).send();
});

export default router;

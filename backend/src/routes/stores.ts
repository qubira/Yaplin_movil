import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, requireOwner } from '../auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const stores = await prisma.store.findMany({ where: { businessId: req.auth!.businessId }, orderBy: { createdAt: 'asc' } });
  res.json(stores);
});

router.post('/', requireOwner, async (req, res) => {
  const { name, address, account, methods, status } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
  const store = await prisma.store.create({
    data: {
      businessId: req.auth!.businessId,
      name,
      address: address ?? '',
      account: account ?? '',
      methods: methods ?? ['yape'],
      status: status ?? 'active',
    },
  });
  res.status(201).json(store);
});

router.put('/:id', requireOwner, async (req, res) => {
  const store = await prisma.store.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  const { name, address, account, methods, status } = req.body ?? {};
  const updated = await prisma.store.update({
    where: { id: store.id },
    data: {
      ...(name !== undefined && { name }),
      ...(address !== undefined && { address }),
      ...(account !== undefined && { account }),
      ...(methods !== undefined && { methods }),
      ...(status !== undefined && { status }),
    },
  });
  res.json(updated);
});

router.delete('/:id', requireOwner, async (req, res) => {
  const store = await prisma.store.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  const count = await prisma.store.count({ where: { businessId: req.auth!.businessId } });
  if (count <= 1) return res.status(400).json({ error: 'Debe existir al menos una tienda' });

  await prisma.user.updateMany({ where: { storeId: store.id }, data: { storeId: null } });
  await prisma.store.delete({ where: { id: store.id } });
  res.status(204).send();
});

export default router;

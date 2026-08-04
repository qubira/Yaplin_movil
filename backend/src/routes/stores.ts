import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, requireOwner } from '../auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const stores = await prisma.store.findMany({ where: { businessId: req.auth!.businessId }, orderBy: { createdAt: 'asc' } });
  res.json(stores);
});

// Two stores in the same business with the same name or the same address
// read as the same physical place from a staff/customer's perspective and
// cause real confusion routing payments — both are enforced unique per
// business (case-insensitive, trimmed). Address uniqueness only applies
// when an address is actually given: an empty address is "not provided",
// not "this store's address", so multiple stores can leave it blank.
async function findDuplicateStore(
  businessId: string,
  name: string,
  address: string,
  excludeId?: string
): Promise<'name' | 'address' | null> {
  const dupName = await prisma.store.findFirst({
    where: { businessId, name: { equals: name, mode: 'insensitive' }, ...(excludeId && { id: { not: excludeId } }) },
  });
  if (dupName) return 'name';

  if (address) {
    const dupAddress = await prisma.store.findFirst({
      where: { businessId, address: { equals: address, mode: 'insensitive' }, ...(excludeId && { id: { not: excludeId } }) },
    });
    if (dupAddress) return 'address';
  }
  return null;
}

router.post('/', requireOwner, async (req, res) => {
  const { name, address, account, methods, status } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'El nombre es requerido' });
  const trimmedName = name.trim();
  const trimmedAddress = (address ?? '').trim();

  const dup = await findDuplicateStore(req.auth!.businessId, trimmedName, trimmedAddress);
  if (dup === 'name') return res.status(409).json({ error: 'Ya existe una tienda con este nombre.' });
  if (dup === 'address') return res.status(409).json({ error: 'Ya existe una tienda con esta dirección.' });

  const store = await prisma.store.create({
    data: {
      businessId: req.auth!.businessId,
      name: trimmedName,
      address: trimmedAddress,
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
  const trimmedName = name !== undefined ? name.trim() : undefined;
  const trimmedAddress = address !== undefined ? address.trim() : undefined;

  const dup = await findDuplicateStore(
    req.auth!.businessId,
    trimmedName ?? store.name,
    trimmedAddress ?? store.address,
    store.id
  );
  if (dup === 'name') return res.status(409).json({ error: 'Ya existe una tienda con este nombre.' });
  if (dup === 'address') return res.status(409).json({ error: 'Ya existe una tienda con esta dirección.' });

  const updated = await prisma.store.update({
    where: { id: store.id },
    data: {
      ...(trimmedName !== undefined && { name: trimmedName }),
      ...(trimmedAddress !== undefined && { address: trimmedAddress }),
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

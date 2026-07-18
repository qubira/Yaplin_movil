import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { requireAuth, requireOwner } from '../auth';

const router = Router();
router.use(requireAuth);

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function toPublicUser(user: { id: string; email: string; name: string; initials: string; role: string; storeId: string | null; active: boolean }) {
  return { id: user.id, email: user.email, name: user.name, initials: user.initials, role: user.role, storeId: user.storeId, active: user.active };
}

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({ where: { businessId: req.auth!.businessId }, orderBy: { createdAt: 'asc' } });
  res.json(users.map(toPublicUser));
});

router.post('/', requireOwner, async (req, res) => {
  const { name, email, password, role, storeId } = req.body ?? {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Faltan campos requeridos' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Ese email ya está registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      businessId: req.auth!.businessId,
      email,
      passwordHash,
      name,
      initials: initialsOf(name),
      role,
      storeId: storeId === 'all' || !storeId ? null : storeId,
      active: true,
    },
  });
  res.status(201).json(toPublicUser(user));
});

router.put('/:id', requireOwner, async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { name, email, password, role, storeId, active } = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (name !== undefined) { data.name = name; data.initials = initialsOf(name); }
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (storeId !== undefined) data.storeId = storeId === 'all' || !storeId ? null : storeId;
  if (active !== undefined) data.active = active;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const updated = await prisma.user.update({ where: { id: existing.id }, data });
  res.json(toPublicUser(updated));
});

router.delete('/:id', requireOwner, async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });
  if (existing.id === req.auth!.userId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

  await prisma.user.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export default router;

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { signToken } from '../auth';

const router = Router();

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function toPublicUser(user: { id: string; email: string; name: string; initials: string; role: string; storeId: string | null; active: boolean; businessId: string }) {
  return {
    id: user.id, email: user.email, name: user.name, initials: user.initials,
    role: user.role, storeId: user.storeId, active: user.active, businessId: user.businessId,
  };
}

router.post('/register', async (req, res) => {
  const { businessName, ruc, ownerName, email, password } = req.body ?? {};
  if (!businessName || !ownerName || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Ese email ya está registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const business = await prisma.business.create({ data: { name: businessName, ruc: ruc || null } });
  await prisma.store.create({
    data: { businessId: business.id, name: businessName, address: '', account: email, methods: ['yape', 'plin', 'izipay'], status: 'active' },
  });
  const user = await prisma.user.create({
    data: {
      businessId: business.id,
      email,
      passwordHash,
      name: ownerName,
      initials: initialsOf(ownerName),
      role: 'owner',
      storeId: null,
      active: true,
    },
  });

  const token = signToken({ userId: user.id, businessId: business.id, role: 'owner', storeId: null });
  res.json({ token, user: toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = signToken({ userId: user.id, businessId: user.businessId, role: user.role as 'owner' | 'supervisor' | 'cajero', storeId: user.storeId });
  res.json({ token, user: toPublicUser(user) });
});

export default router;

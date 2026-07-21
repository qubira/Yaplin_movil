import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { signToken } from '../auth';
import { checkBusinessAccess, getSubscriptionSummary, type SubscriptionSummary } from '../subscription';

const router = Router();

function toPublicUser(
  user: {
    id: string;
    email: string;
    name: string;
    initials: string;
    role: string;
    storeId: string | null;
    active: boolean;
    businessId: string;
  },
  subscription: SubscriptionSummary | null
) {
  return {
    id: user.id, email: user.email, name: user.name, initials: user.initials,
    role: user.role, storeId: user.storeId, active: user.active, businessId: user.businessId,
    subscription,
  };
}

router.post('/register', (_req, res) => {
  res.status(403).json({
    error: 'El registro de nuevos negocios ahora se gestiona desde el panel de administración.',
    code: 'REGISTRATION_DISABLED',
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Faltan credenciales' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

  const access = await checkBusinessAccess(user.businessId);
  if (!user.active || !access.allowed) {
    const message =
      access.code === 'ACCOUNT_EXPIRED' ? 'Tu suscripción venció.' : 'Tu cuenta fue suspendida.';
    return res.status(403).json({ error: message, code: access.code ?? 'ACCOUNT_SUSPENDED' });
  }

  const subscription = await getSubscriptionSummary(user.businessId);
  const token = signToken({
    userId: user.id,
    businessId: user.businessId,
    role: user.role as 'owner' | 'supervisor' | 'cajero',
    storeId: user.storeId,
  });
  res.json({ token, user: toPublicUser(user, subscription) });
});

export default router;

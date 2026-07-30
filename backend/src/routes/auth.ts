import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { signToken } from '../auth';
import { checkBusinessAccess, getSubscriptionSummary, type SubscriptionSummary } from '../subscription';
import { normalizeEmail, requestIp } from '../audit';
import { logBlockedIntent, recordSuccessfulLogin } from '../security';

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
    business: { name: string };
  },
  subscription: SubscriptionSummary | null
) {
  return {
    id: user.id, email: user.email, name: user.name, initials: user.initials,
    role: user.role, storeId: user.storeId, active: user.active, businessId: user.businessId,
    businessName: user.business.name,
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
  const { email: rawEmail, password } = req.body ?? {};
  if (!rawEmail || !password) return res.status(400).json({ error: 'Faltan credenciales' });
  const email = normalizeEmail(rawEmail);

  const user = await prisma.user.findUnique({ where: { email }, include: { business: { select: { name: true } } } });
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    // We only know the business/user once the email matches, so an unknown
    // email is never logged here (IntentAuditLog.businessId is required) —
    // a wrong password for a real account is what feeds risk escalation.
    await logBlockedIntent({
      businessId: user.businessId,
      userId: user.id,
      actorEmail: user.email,
      eventType: 'LOGIN_FAILED',
      severity: 'low',
      ipAddress: requestIp(req),
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    });
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const access = await checkBusinessAccess(user.businessId);
  if (!user.active || !access.allowed) {
    const message =
      access.code === 'ACCOUNT_EXPIRED' ? 'Tu suscripción venció.' : 'Tu cuenta fue suspendida.';
    return res.status(403).json({ error: message, code: access.code ?? 'ACCOUNT_SUSPENDED' });
  }

  await recordSuccessfulLogin(user.id);

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

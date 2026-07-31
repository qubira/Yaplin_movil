import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { requireAuth } from '../auth';
import { getSubscriptionSummary } from '../subscription';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    include: { business: { select: { name: true } } },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const subscription = await getSubscriptionSummary(user.businessId);

  res.json({
    id: user.id, email: user.email, name: user.name, initials: user.initials,
    role: user.role, storeId: user.storeId, active: user.active, businessId: user.businessId,
    businessName: user.business.name,
    hasTransactionPin: !!user.transactionPinHash,
    riskLevel: user.riskLevel,
    soundAlertEnabled: user.soundAlertEnabled,
    subscription,
  });
});

// PATCH /me/pin — set, change, or clear the money-action confirmation PIN.
// Requires the account password again (a sensitive change), since the PIN
// itself is what stands between an unlocked phone and editing/voiding money.
// `newPin: null` clears it, falling back to the "CONFIRMAR" text gate.
router.patch('/pin', requireAuth, async (req, res) => {
  const { password, newPin } = req.body ?? {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Se requiere tu contraseña.' });
  }
  if (newPin !== null && (typeof newPin !== 'string' || !/^\d{4,8}$/.test(newPin))) {
    return res.status(400).json({ error: 'El PIN debe tener entre 4 y 8 dígitos, o enviar null para quitarlo.' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta.' });

  const transactionPinHash = newPin === null ? null : await bcrypt.hash(newPin, 10);
  await prisma.user.update({ where: { id: user.id }, data: { transactionPinHash } });

  res.json({ hasTransactionPin: transactionPinHash !== null });
});

export default router;

import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth } from '../auth';

const router = Router();
router.use(requireAuth);

// GET /security/intents — Centro de Alertas. Per the spec this is visible
// to owner (everything) and supervisor (their store) only — cajero has no
// access at all. Supervisor is scoped to intents logged by users currently
// assigned to their own store (IntentAuditLog has no storeId of its own —
// it denormalizes the actor's email/role at the time, not a store — so
// scoping goes through the current User.storeId assignment).
router.get('/intents', async (req, res) => {
  const { role, storeId, businessId } = req.auth!;
  if (role === 'cajero') return res.status(403).json({ error: 'No tienes acceso al Centro de Alertas.' });

  const where: Prisma.IntentAuditLogWhereInput = { businessId };

  if (role === 'supervisor' && storeId) {
    const scopedUsers = await prisma.user.findMany({ where: { businessId, storeId }, select: { id: true } });
    where.userId = { in: scopedUsers.map((u) => u.id) };
  }

  const intents = await prisma.intentAuditLog.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(intents);
});

export default router;

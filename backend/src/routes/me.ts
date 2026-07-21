import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../auth';
import { getSubscriptionSummary } from '../subscription';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const subscription = await getSubscriptionSummary(user.businessId);

  res.json({
    id: user.id, email: user.email, name: user.name, initials: user.initials,
    role: user.role, storeId: user.storeId, active: user.active, businessId: user.businessId,
    subscription,
  });
});

export default router;

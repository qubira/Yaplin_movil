import { prisma } from './db';

export type AccessDenialCode = 'ACCOUNT_SUSPENDED' | 'ACCOUNT_EXPIRED';

export interface AccessCheckResult {
  allowed: boolean;
  code?: AccessDenialCode;
}

export interface SubscriptionSummary {
  status: string;
  planName: string;
  currentPeriodEnd: string;
  daysRemaining: number;
}

/**
 * Businesses created before YapLin_Admin existed have no Subscription row
 * at all — those stay unrestricted. Every business created from now on
 * (only via YapLin_Admin, since self-registration is disabled) always gets
 * one, so this is the single gate that both blocks a suspended/expired
 * account and self-heals a subscription that ran out without anyone
 * suspending it by hand.
 */
export async function checkBusinessAccess(businessId: string): Promise<AccessCheckResult> {
  const subscription = await prisma.subscription.findUnique({ where: { businessId } });
  if (!subscription) return { allowed: true };

  let status: string = subscription.status;

  if ((status === 'trial' || status === 'active') && subscription.currentPeriodEnd < new Date()) {
    await prisma.$transaction([
      prisma.subscription.update({
        where: { businessId },
        data: { status: 'expired' },
      }),
      prisma.user.updateMany({
        where: { businessId },
        data: { active: false },
      }),
    ]);
    status = 'expired';
  }

  if (status === 'suspended') return { allowed: false, code: 'ACCOUNT_SUSPENDED' };
  if (status === 'expired' || status === 'cancelled') return { allowed: false, code: 'ACCOUNT_EXPIRED' };
  return { allowed: true };
}

export async function getSubscriptionSummary(businessId: string): Promise<SubscriptionSummary | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { businessId },
    include: { planRef: true },
  });
  if (!subscription) return null;

  const daysRemaining = Math.ceil(
    (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    status: subscription.status,
    planName: subscription.planRef?.name ?? subscription.plan,
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    daysRemaining,
  };
}

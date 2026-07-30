import { Request, Response, NextFunction } from 'express';
import { IntentEventType, IntentSeverity, RiskLevel, Prisma } from '@prisma/client';
import { prisma } from './db';
import { requestIp } from './audit';

// ---------------------------------------------------------------------------
// Risk-level thresholds — rolling 5-minute window, plain UTC arithmetic (Lima
// only matters for archiving / "same day", not for this window).
// ---------------------------------------------------------------------------
const RISK_WINDOW_MS = 5 * 60 * 1000;
const WATCH_THRESHOLD = 5;
const SUSPICIOUS_THRESHOLD = 15;
const BLOCKED_THRESHOLD = 40;

const RISK_ORDER: RiskLevel[] = ['normal', 'watch', 'suspicious', 'blocked'];

function riskOrdinal(level: RiskLevel): number {
  return RISK_ORDER.indexOf(level);
}

function levelForCount(count: number): RiskLevel {
  if (count >= BLOCKED_THRESHOLD) return 'blocked';
  if (count >= SUSPICIOUS_THRESHOLD) return 'suspicious';
  if (count >= WATCH_THRESHOLD) return 'watch';
  return 'normal';
}

// ---------------------------------------------------------------------------
// Push-notification cooldown — in-memory per process, 5 minutes, bypassed for
// `critical` severity. There is no real push-delivery infrastructure wired up
// in this backend yet (Expo token / FCM credentials are a separate, already
// scoped piece of work) — this just tracks *whether* a notification would be
// allowed right now, so it is ready to call into that infra later.
// ---------------------------------------------------------------------------
const NOTIFY_COOLDOWN_MS = 5 * 60 * 1000;
const notifyCooldowns = new Map<string, number>();

export function shouldNotifyNow(key: string, bypassCooldown: boolean): boolean {
  const now = Date.now();
  if (bypassCooldown) {
    notifyCooldowns.set(key, now);
    return true;
  }
  const last = notifyCooldowns.get(key);
  if (last !== undefined && now - last < NOTIFY_COOLDOWN_MS) return false;
  notifyCooldowns.set(key, now);
  return true;
}

// ---------------------------------------------------------------------------
// Blocked-intent audit log (own table, separate from the shared AuditLog).
// ---------------------------------------------------------------------------
export interface LogBlockedIntentEntry {
  businessId: string;
  userId: string | null;
  actorEmail: string;
  actorName?: string | null;
  actorRole?: string | null;
  actorStoreId?: string | null;
  eventType: IntentEventType;
  severity: IntentSeverity;
  detail?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Records a blocked/failed intent and recomputes the actor's risk level from
 * a rolling 5-minute window of their own intents. Only ever escalates here —
 * de-escalation happens exclusively via `recordSuccessfulLogin`, and
 * `blocked` never auto-clears at all (requires an explicit owner action).
 */
export async function logBlockedIntent(entry: LogBlockedIntentEntry): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.intentAuditLog.create({
      data: {
        businessId: entry.businessId,
        userId: entry.userId,
        actorEmail: entry.actorEmail,
        actorName: entry.actorName ?? null,
        actorRole: entry.actorRole ?? null,
        actorStoreId: entry.actorStoreId ?? null,
        eventType: entry.eventType,
        severity: entry.severity,
        detail: entry.detail,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });

    if (!entry.userId) return; // unauthenticated intent (e.g. login against an unknown email) — nobody to escalate

    const since = new Date(Date.now() - RISK_WINDOW_MS);
    const windowCount = await tx.intentAuditLog.count({
      where: { userId: entry.userId, createdAt: { gte: since } },
    });

    const user = await tx.user.findUnique({ where: { id: entry.userId } });
    if (!user) return;

    const computed = levelForCount(windowCount);
    if (riskOrdinal(computed) <= riskOrdinal(user.riskLevel)) return; // only escalate, never silently downgrade

    const data: Prisma.UserUpdateInput = { riskLevel: computed };
    let autoBlocked = false;

    if (computed === 'blocked') {
      const business = await tx.business.findUnique({ where: { id: entry.businessId } });
      if (business?.autoBlockEnabled) {
        data.active = false;
        autoBlocked = true;
      }
    }

    await tx.user.update({ where: { id: entry.userId }, data });

    await tx.intentAuditLog.create({
      data: {
        businessId: entry.businessId,
        userId: entry.userId,
        actorEmail: entry.actorEmail,
        actorName: user.name,
        actorRole: user.role,
        actorStoreId: user.storeId,
        eventType: 'RISK_ESCALATED',
        severity: computed === 'blocked' ? 'critical' : computed === 'suspicious' ? 'high' : 'medium',
        detail: { from: user.riskLevel, to: computed, windowCount },
      },
    });

    if (autoBlocked) {
      await tx.intentAuditLog.create({
        data: {
          businessId: entry.businessId,
          userId: entry.userId,
          actorEmail: entry.actorEmail,
          actorName: user.name,
          actorRole: user.role,
          actorStoreId: user.storeId,
          eventType: 'ACCOUNT_AUTO_BLOCKED',
          severity: 'critical',
          detail: { windowCount },
        },
      });
    }

    if (computed === 'suspicious' || computed === 'blocked') {
      // Notify the owner immediately (bypasses cooldown once truly blocked).
      // No real push-delivery transport exists yet — this is the hook point
      // for it, kept ready via `shouldNotifyNow`'s cooldown bookkeeping.
      shouldNotifyNow(`${entry.userId}:RISK_ESCALATED`, autoBlocked);
    }
  });
}

/**
 * Called on a successful login. Relaxes `watch`/`suspicious` back down using
 * the same rolling window (old failed intents naturally age out of it), but
 * never automatically below `watch`, and never touches `blocked` — that only
 * clears via an explicit owner action.
 */
export async function recordSuccessfulLogin(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.riskLevel !== 'watch' && user.riskLevel !== 'suspicious') return;

  const since = new Date(Date.now() - RISK_WINDOW_MS);
  const windowCount = await prisma.intentAuditLog.count({ where: { userId, createdAt: { gte: since } } });
  const computed = levelForCount(windowCount);

  const floor: RiskLevel = 'watch';
  const target = riskOrdinal(computed) < riskOrdinal(floor) ? floor : computed;

  if (riskOrdinal(target) < riskOrdinal(user.riskLevel)) {
    await prisma.user.update({ where: { id: userId }, data: { riskLevel: target } });
  }
}

/**
 * Same gate as `requireOwner` in `auth.ts`, but for the money-affecting
 * transaction routes specifically: a non-owner hitting one of these is
 * exactly the scenario the owner's spec calls out by name ("un cajero
 * intenta modificar un monto", "intentó crear un pago manual") — it must
 * be logged, not just silently 403'd. Kept separate from the generic
 * `requireOwner` (used elsewhere, e.g. team.ts) so that middleware's
 * existing behavior/callers stay untouched.
 */
export function requireOwnerLogged(actionAttempted: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return res.status(401).json({ error: 'No autorizado' });
    if (auth.role === 'owner') return next();

    await logBlockedIntent({
      businessId: auth.businessId,
      userId: auth.userId,
      actorEmail: auth.email,
      actorName: auth.name,
      actorRole: auth.role,
      actorStoreId: auth.storeId,
      eventType: 'BLOCKED_ROLE_ACTION',
      severity: 'high',
      detail: { actionAttempted, path: req.originalUrl, method: req.method, body: req.body },
      ipAddress: requestIp(req),
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    });
    return res.status(403).json({ error: 'Solo el dueño puede hacer esto' });
  };
}

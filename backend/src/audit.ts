import { Request } from 'express';
import { prisma } from './db';
import { AuditAction, Prisma } from '@prisma/client';

export const AUDIT_ORIGIN = {
  ADMIN: 'admin',
  MOBILE: 'mobile',
  WEB: 'web',
  BACKEND: 'backend',
} as const;

export type AuditOrigin = (typeof AUDIT_ORIGIN)[keyof typeof AUDIT_ORIGIN];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function requestIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip ?? null;
}

interface WriteAuditLogEntry {
  actorEmail: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  businessId: string | null;
  summary: string;
  changes?: Prisma.InputJsonValue;
  origin: AuditOrigin;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes to the same AuditLog table YapLin_Admin uses (see
 * YapLin_Admin/db/*.sql — this backend never owns/migrates that table).
 * adminId always stays null here since the actor is a regular business
 * User, not an AdminUser; adminEmail is repurposed as a free-text "who did
 * this" field, which is all the admin panel's UI actually reads from it.
 */
export async function writeAuditLog(
  tx: Pick<typeof prisma, 'auditLog'>,
  entry: WriteAuditLogEntry
) {
  await tx.auditLog.create({
    data: {
      adminId: null,
      adminEmail: entry.actorEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      businessId: entry.businessId,
      summary: entry.summary,
      changes: entry.changes,
      origin: entry.origin,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    },
  });
}

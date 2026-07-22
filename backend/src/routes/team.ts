import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { requireAuth, requireOwner } from '../auth';
import { AUDIT_ORIGIN, normalizeEmail, requestIp, writeAuditLog } from '../audit';

const router = Router();
router.use(requireAuth);

const EMAIL_IN_USE_MESSAGE = 'Este correo ya está registrado en YapLin.';

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

function toPublicUser(user: { id: string; email: string; name: string; initials: string; role: string; storeId: string | null; active: boolean }) {
  return { id: user.id, email: user.email, name: user.name, initials: user.initials, role: user.role, storeId: user.storeId, active: user.active };
}

// True when `err` is Prisma's unique-constraint violation (wraps Postgres
// 23505). The pre-check below is only for a friendly message — this is the
// real protection against a duplicate email slipping in via a race.
function isUniqueEmailViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta!.target as string[]).includes('email')
  );
}

router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({ where: { businessId: req.auth!.businessId }, orderBy: { createdAt: 'asc' } });
  res.json(users.map(toPublicUser));
});

router.post('/', requireOwner, async (req, res) => {
  const { name, email: rawEmail, password, role, storeId } = req.body ?? {};
  if (!name || !rawEmail || !password || !role) return res.status(400).json({ error: 'Faltan campos requeridos' });
  const email = normalizeEmail(rawEmail);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: EMAIL_IN_USE_MESSAGE, code: 'EMAIL_IN_USE' });

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
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

      await writeAuditLog(tx, {
        actorEmail: req.auth!.email,
        action: 'CREATE',
        entityType: 'User',
        entityId: created.id,
        businessId: req.auth!.businessId,
        summary: `${req.auth!.email} creó al usuario ${created.email} (${created.role}).`,
        origin: AUDIT_ORIGIN.MOBILE,
        ipAddress: requestIp(req),
        userAgent: req.headers['user-agent'] ?? null,
      });

      return created;
    });
    res.status(201).json(toPublicUser(user));
  } catch (err) {
    if (isUniqueEmailViolation(err)) {
      return res.status(409).json({ error: EMAIL_IN_USE_MESSAGE, code: 'EMAIL_IN_USE' });
    }
    throw err;
  }
});

router.put('/:id', requireOwner, async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });

  const { name, email: rawEmail, password, role, storeId, active } = req.body ?? {};
  const email = rawEmail !== undefined ? normalizeEmail(rawEmail) : undefined;

  if (email !== undefined && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) return res.status(409).json({ error: EMAIL_IN_USE_MESSAGE, code: 'EMAIL_IN_USE' });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) { data.name = name; data.initials = initialsOf(name); }
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (storeId !== undefined) data.storeId = storeId === 'all' || !storeId ? null : storeId;
  if (active !== undefined) data.active = active;
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const fieldChanges: Record<string, { old: string | null; new: string | null }> = {};
  if (name !== undefined && name !== existing.name) fieldChanges.name = { old: existing.name, new: name };
  if (email !== undefined && email !== existing.email) fieldChanges.email = { old: existing.email, new: email };
  if (role !== undefined && role !== existing.role) fieldChanges.role = { old: existing.role, new: role };
  if (storeId !== undefined && (data.storeId as string | null) !== existing.storeId) {
    fieldChanges.storeId = { old: existing.storeId, new: data.storeId as string | null };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({ where: { id: existing.id }, data });
      const ipAddress = requestIp(req);
      const userAgent = req.headers['user-agent'] ?? null;

      if (active !== undefined && active !== existing.active) {
        await writeAuditLog(tx, {
          actorEmail: req.auth!.email,
          action: active ? 'REACTIVATE' : 'SUSPEND',
          entityType: 'User',
          entityId: existing.id,
          businessId: req.auth!.businessId,
          summary: `${req.auth!.email} ${active ? 'activó' : 'desactivó'} al usuario ${existing.email}.`,
          changes: { active: { old: existing.active, new: active } },
          origin: AUDIT_ORIGIN.MOBILE,
          ipAddress,
          userAgent,
        });
      }

      if (password) {
        await writeAuditLog(tx, {
          actorEmail: req.auth!.email,
          action: 'PASSWORD_RESET',
          entityType: 'User',
          entityId: existing.id,
          businessId: req.auth!.businessId,
          summary: `${req.auth!.email} restableció la contraseña de ${existing.email}.`,
          origin: AUDIT_ORIGIN.MOBILE,
          ipAddress,
          userAgent,
        });
      }

      if (Object.keys(fieldChanges).length > 0) {
        await writeAuditLog(tx, {
          actorEmail: req.auth!.email,
          action: 'UPDATE',
          entityType: 'User',
          entityId: existing.id,
          businessId: req.auth!.businessId,
          summary: `${req.auth!.email} actualizó datos de ${existing.email} (${Object.keys(fieldChanges).join(', ')}).`,
          changes: fieldChanges,
          origin: AUDIT_ORIGIN.MOBILE,
          ipAddress,
          userAgent,
        });
      }

      return result;
    });
    res.json(toPublicUser(updated));
  } catch (err) {
    if (isUniqueEmailViolation(err)) {
      return res.status(409).json({ error: EMAIL_IN_USE_MESSAGE, code: 'EMAIL_IN_USE' });
    }
    throw err;
  }
});

router.delete('/:id', requireOwner, async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, businessId: req.auth!.businessId } });
  if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });
  if (existing.id === req.auth!.userId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });

  // Audit before deleting, in the same transaction, so the log keeps the
  // full record (email, role, store) of exactly who got removed, and a
  // failure here rolls back the delete instead of losing the trail.
  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      actorEmail: req.auth!.email,
      action: 'DELETE',
      entityType: 'User',
      entityId: existing.id,
      businessId: req.auth!.businessId,
      summary: `${req.auth!.email} eliminó al usuario ${existing.email} (${existing.role}).`,
      changes: { deleted: { old: toPublicUser(existing), new: null } },
      origin: AUDIT_ORIGIN.MOBILE,
      ipAddress: requestIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });

    await tx.user.delete({ where: { id: existing.id } });
  });

  res.status(204).send();
});

export default router;

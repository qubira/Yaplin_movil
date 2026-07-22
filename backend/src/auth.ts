import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './db';
import { checkBusinessAccess } from './subscription';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthPayload {
  userId: string;
  businessId: string;
  role: 'owner' | 'supervisor' | 'cajero';
  storeId: string | null;
}

export interface AuthContext extends AuthPayload {
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });

  let payload: AuthPayload;
  try {
    payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.active) {
      return res.status(403).json({ error: 'Tu cuenta fue suspendida.', code: 'ACCOUNT_SUSPENDED' });
    }

    const access = await checkBusinessAccess(user.businessId);
    if (!access.allowed) {
      const message =
        access.code === 'ACCOUNT_EXPIRED' ? 'Tu suscripción venció.' : 'Tu cuenta fue suspendida.';
      return res.status(403).json({ error: message, code: access.code });
    }

    req.auth = { ...payload, email: user.email };
    next();
  } catch (err) {
    console.error('requireAuth check failed:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'owner') return res.status(403).json({ error: 'Solo el dueño puede hacer esto' });
  next();
}

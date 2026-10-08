import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// In-memory token store: token -> userId
const tokenStore = new Map<string, { userId: string; expiresAt: number }>();

export function createSessionToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  tokenStore.set(token, { userId, expiresAt });
  return token;
}

export function verifySessionToken(token: string): string | null {
  const session = tokenStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return session.userId;
}

export function revokeSessionToken(token: string) {
  tokenStore.delete(token);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const userId = verifySessionToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  const user = db.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

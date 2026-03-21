import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'mitarbeiter';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Nur für Admins' });
    return;
  }
  next();
}

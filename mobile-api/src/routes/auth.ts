import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, execute } from '../db/connection';
import { generateToken, authMiddleware, AuthRequest, AuthUser } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail'),
  password: z.string().min(1, 'Passwort erforderlich'),
});

const registerSchema = z.object({
  email: z.string().email('Ungültige E-Mail'),
  password: z.string().min(6, 'Passwort mindestens 6 Zeichen'),
  name: z.string().min(1, 'Name erforderlich'),
  role: z.enum(['admin', 'mitarbeiter']).default('mitarbeiter'),
});

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'mitarbeiter';
  active: boolean;
}

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const users = await query<UserRow[]>(
      'SELECT * FROM brenn_users WHERE email = ? AND active = TRUE',
      [email]
    );

    if (users.length === 0) {
      res.status(401).json({ error: 'E-Mail oder Passwort falsch' });
      return;
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'E-Mail oder Passwort falsch' });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    res.json({
      token: generateToken(authUser),
      user: authUser,
    });
  } catch (error) {
    console.error('Login-Fehler:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// POST /api/auth/register (nur Admin)
router.post(
  '/register',
  authMiddleware,
  validate(registerSchema),
  async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Nur Admins können Benutzer anlegen' });
      return;
    }

    try {
      const { email, password, name, role } = req.body;

      const existing = await query<UserRow[]>(
        'SELECT id FROM brenn_users WHERE email = ?',
        [email]
      );
      if (existing.length > 0) {
        res.status(409).json({ error: 'E-Mail bereits vergeben' });
        return;
      }

      const hash = await bcrypt.hash(password, 12);
      const result = await execute(
        'INSERT INTO brenn_users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
        [email, hash, name, role]
      );

      res.status(201).json({
        id: result.insertId,
        email,
        name,
        role,
      });
    } catch (error) {
      console.error('Register-Fehler:', error);
      res.status(500).json({ error: 'Interner Fehler' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;

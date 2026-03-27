import { Router, Response } from 'express';
import { z } from 'zod';
import { query, execute } from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);

const kilnSchema = z.object({
  name: z.string().min(1, 'Name erforderlich').max(255),
  max_temp: z.number().int().positive().optional().nullable(),
  description: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
});

interface KilnRow {
  id: number;
  name: string;
  max_temp: number | null;
  description: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// GET /api/kilns
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const kilns = await query<KilnRow[]>(
      'SELECT * FROM brenn_kilns ORDER BY name'
    );
    res.json(kilns);
  } catch (error) {
    console.error('Öfen laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/kilns/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const kilns = await query<KilnRow[]>(
      'SELECT * FROM brenn_kilns WHERE id = ?',
      [req.params.id]
    );
    if (kilns.length === 0) {
      res.status(404).json({ error: 'Ofen nicht gefunden' });
      return;
    }

    // Aktuelle Belegung
    const currentLoad = await query(
      `SELECT o.*, c.first_name, c.last_name
       FROM brenn_orders o
       JOIN brenn_customers c ON o.customer_id = c.id
       WHERE o.kiln_id = ? AND o.status = 'im_ofen'
       ORDER BY o.updated_at DESC`,
      [req.params.id]
    );

    // Verlauf (letzte 20 Brände)
    const history = await query(
      `SELECT o.*, c.first_name, c.last_name
       FROM brenn_orders o
       JOIN brenn_customers c ON o.customer_id = c.id
       WHERE o.kiln_id = ? AND o.status IN ('gebrannt', 'abholbereit', 'abgeschlossen')
       ORDER BY o.updated_at DESC
       LIMIT 20`,
      [req.params.id]
    );

    res.json({ ...kilns[0], currentLoad, history });
  } catch (error) {
    console.error('Ofen laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// POST /api/kilns
router.post('/', validate(kilnSchema), async (_req: AuthRequest, res: Response) => {
  try {
    const { name, max_temp, description, active } = _req.body;
    const result = await execute(
      'INSERT INTO brenn_kilns (name, max_temp, description, active) VALUES (?, ?, ?, ?)',
      [name, max_temp || null, description || null, active ? 1 : 0]
    );

    const kilns = await query<KilnRow[]>(
      'SELECT * FROM brenn_kilns WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(kilns[0]);
  } catch (error) {
    console.error('Ofen erstellen fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// PUT /api/kilns/:id
router.put('/:id', validate(kilnSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name, max_temp, description, active } = req.body;
    const result = await execute(
      'UPDATE brenn_kilns SET name = ?, max_temp = ?, description = ?, active = ? WHERE id = ?',
      [name, max_temp || null, description || null, active ? 1 : 0, req.params.id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Ofen nicht gefunden' });
      return;
    }

    const kilns = await query<KilnRow[]>(
      'SELECT * FROM brenn_kilns WHERE id = ?',
      [req.params.id]
    );
    res.json(kilns[0]);
  } catch (error) {
    console.error('Ofen aktualisieren fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/kilns/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Prüfe ob Aufträge zugeordnet
    const orders = await query<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM brenn_orders WHERE kiln_id = ? AND status NOT IN ("abgeschlossen", "storniert")',
      [req.params.id]
    );

    if (orders[0].count > 0) {
      res.status(409).json({ error: 'Ofen hat noch aktive Aufträge' });
      return;
    }

    await execute('DELETE FROM brenn_kilns WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Ofen löschen fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;

import { Router, Response } from 'express';
import { z } from 'zod';
import { query, execute } from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);

const ORDER_STATUSES = ['neu', 'geplant', 'im_ofen', 'gebrannt', 'abholbereit', 'abgeschlossen', 'storniert'] as const;

const orderSchema = z.object({
  customer_id: z.number().int().positive(),
  kiln_id: z.number().int().positive().nullable().optional(),
  title: z.string().min(1, 'Bezeichnung erforderlich').max(255),
  category: z.string().max(100).optional().or(z.literal('')),
  quantity: z.number().int().positive().default(1),
  firing_type: z.string().max(100).optional().or(z.literal('')),
  temperature: z.number().int().positive().optional().nullable(),
  firing_program: z.string().max(100).optional().or(z.literal('')),
  desired_date: z.string().optional().or(z.literal('')),
  status: z.enum(ORDER_STATUSES).default('neu'),
  notes: z.string().optional().or(z.literal('')),
  price: z.number().min(0).optional().nullable(),
  paid: z.boolean().default(false),
});

const statusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().optional(),
});

// GET /api/orders
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, kiln_id, paid, customer_id, search, firing_type, date_from, date_to } = req.query;

    let sql = `
      SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
      FROM brenn_orders o
      JOIN brenn_customers c ON o.customer_id = c.id
      LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (kiln_id) {
      sql += ' AND o.kiln_id = ?';
      params.push(kiln_id);
    }
    if (paid !== undefined) {
      sql += ' AND o.paid = ?';
      params.push(paid === 'true' ? 1 : 0);
    }
    if (customer_id) {
      sql += ' AND o.customer_id = ?';
      params.push(customer_id);
    }
    if (firing_type) {
      sql += ' AND o.firing_type = ?';
      params.push(firing_type);
    }
    if (date_from) {
      sql += ' AND o.desired_date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      sql += ' AND o.desired_date <= ?';
      params.push(date_to);
    }
    if (search) {
      sql += ' AND (o.title LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY o.created_at DESC LIMIT 200';

    const orders = await query(sql, params);
    res.json(orders);
  } catch (error) {
    console.error('Aufträge laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/orders/dashboard
router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  try {
    const [open, inProgress, dueToday, recentDone] = await Promise.all([
      query(
        `SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
         FROM brenn_orders o
         JOIN brenn_customers c ON o.customer_id = c.id
         LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
         WHERE o.status = 'neu'
         ORDER BY o.created_at DESC LIMIT 20`
      ),
      query(
        `SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
         FROM brenn_orders o
         JOIN brenn_customers c ON o.customer_id = c.id
         LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
         WHERE o.status IN ('geplant', 'im_ofen')
         ORDER BY o.desired_date ASC LIMIT 20`
      ),
      query(
        `SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
         FROM brenn_orders o
         JOIN brenn_customers c ON o.customer_id = c.id
         LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
         WHERE o.desired_date = CURDATE() AND o.status NOT IN ('abgeschlossen', 'storniert')
         ORDER BY o.created_at DESC`
      ),
      query(
        `SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
         FROM brenn_orders o
         JOIN brenn_customers c ON o.customer_id = c.id
         LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
         WHERE o.status IN ('abholbereit', 'abgeschlossen')
         ORDER BY o.updated_at DESC LIMIT 10`
      ),
    ]);

    const counts = await query<{ status: string; count: number }[]>(
      `SELECT status, COUNT(*) as count FROM brenn_orders
       WHERE status NOT IN ('abgeschlossen', 'storniert')
       GROUP BY status`
    );

    res.json({
      open,
      inProgress,
      dueToday,
      recentDone,
      counts: counts.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Dashboard laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await query<any[]>(
      `SELECT o.*, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone,
              k.name as kiln_name
       FROM brenn_orders o
       JOIN brenn_customers c ON o.customer_id = c.id
       LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      res.status(404).json({ error: 'Auftrag nicht gefunden' });
      return;
    }

    const [images, history] = await Promise.all([
      query(
        'SELECT * FROM brenn_order_images WHERE order_id = ? ORDER BY uploaded_at DESC',
        [req.params.id]
      ),
      query(
        `SELECT h.*, u.name as changed_by_name
         FROM brenn_order_history h
         LEFT JOIN brenn_users u ON h.changed_by = u.id
         WHERE h.order_id = ?
         ORDER BY h.changed_at DESC`,
        [req.params.id]
      ),
    ]);

    res.json({ ...orders[0], images, history });
  } catch (error) {
    console.error('Auftrag laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// POST /api/orders
router.post('/', validate(orderSchema), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const result = await execute(
      `INSERT INTO brenn_orders
       (customer_id, kiln_id, title, category, quantity, firing_type, temperature,
        firing_program, desired_date, status, notes, price, paid, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.customer_id, data.kiln_id || null, data.title,
        data.category || null, data.quantity, data.firing_type || null,
        data.temperature || null, data.firing_program || null,
        data.desired_date || null, data.status || 'neu',
        data.notes || null, data.price || null, data.paid ? 1 : 0,
        req.user?.id || null,
      ]
    );

    await execute(
      'INSERT INTO brenn_order_history (order_id, new_status, changed_by, note) VALUES (?, ?, ?, ?)',
      [result.insertId, data.status || 'neu', req.user?.id || null, 'Auftrag erstellt']
    );

    const orders = await query<any[]>(
      `SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
       FROM brenn_orders o
       JOIN brenn_customers c ON o.customer_id = c.id
       LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
       WHERE o.id = ?`,
      [result.insertId]
    );

    res.status(201).json(orders[0]);
  } catch (error) {
    console.error('Auftrag erstellen fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// PUT /api/orders/:id
router.put('/:id', validate(orderSchema), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const result = await execute(
      `UPDATE brenn_orders SET
       customer_id = ?, kiln_id = ?, title = ?, category = ?, quantity = ?,
       firing_type = ?, temperature = ?, firing_program = ?, desired_date = ?,
       notes = ?, price = ?, paid = ?
       WHERE id = ?`,
      [
        data.customer_id, data.kiln_id || null, data.title,
        data.category || null, data.quantity, data.firing_type || null,
        data.temperature || null, data.firing_program || null,
        data.desired_date || null, data.notes || null,
        data.price || null, data.paid ? 1 : 0, req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Auftrag nicht gefunden' });
      return;
    }

    const orders = await query<any[]>(
      `SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
       FROM brenn_orders o
       JOIN brenn_customers c ON o.customer_id = c.id
       LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
       WHERE o.id = ?`,
      [req.params.id]
    );
    res.json(orders[0]);
  } catch (error) {
    console.error('Auftrag aktualisieren fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', validate(statusUpdateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = req.body;

    const existing = await query<any[]>(
      'SELECT status FROM brenn_orders WHERE id = ?',
      [req.params.id]
    );
    if (existing.length === 0) {
      res.status(404).json({ error: 'Auftrag nicht gefunden' });
      return;
    }

    const oldStatus = existing[0].status;
    await execute('UPDATE brenn_orders SET status = ? WHERE id = ?', [status, req.params.id]);

    await execute(
      'INSERT INTO brenn_order_history (order_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, oldStatus, status, req.user?.id || null, note || null]
    );

    const orders = await query<any[]>(
      `SELECT o.*, c.first_name, c.last_name, k.name as kiln_name
       FROM brenn_orders o
       JOIN brenn_customers c ON o.customer_id = c.id
       LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
       WHERE o.id = ?`,
      [req.params.id]
    );
    res.json(orders[0]);
  } catch (error) {
    console.error('Status ändern fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await execute('DELETE FROM brenn_orders WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Auftrag löschen fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;

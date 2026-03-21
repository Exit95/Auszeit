import { Router, Response } from 'express';
import { z } from 'zod';
import { query, execute } from '../db/connection';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);

const customerSchema = z.object({
  first_name: z.string().min(1, 'Vorname erforderlich').max(255),
  last_name: z.string().min(1, 'Nachname erforderlich').max(255),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

interface CustomerRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// GET /api/customers
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const customers = await query<CustomerRow[]>(
      'SELECT * FROM brenn_customers ORDER BY last_name, first_name'
    );
    res.json(customers);
  } catch (error) {
    console.error('Kunden laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/customers/search?q=...
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const customers = await query<CustomerRow[]>(
      `SELECT * FROM brenn_customers
       WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?
       ORDER BY last_name, first_name
       LIMIT 50`,
      [q, q, q, q]
    );
    res.json(customers);
  } catch (error) {
    console.error('Kundensuche fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const customers = await query<CustomerRow[]>(
      'SELECT * FROM brenn_customers WHERE id = ?',
      [req.params.id]
    );
    if (customers.length === 0) {
      res.status(404).json({ error: 'Kunde nicht gefunden' });
      return;
    }
    res.json(customers[0]);
  } catch (error) {
    console.error('Kunde laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// GET /api/customers/:id/orders
router.get('/:id/orders', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await query(
      `SELECT o.*, k.name as kiln_name
       FROM brenn_orders o
       LEFT JOIN brenn_kilns k ON o.kiln_id = k.id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`,
      [req.params.id]
    );
    res.json(orders);
  } catch (error) {
    console.error('Kundenaufträge laden fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// POST /api/customers
router.post('/', validate(customerSchema), async (_req: AuthRequest, res: Response) => {
  try {
    const { first_name, last_name, email, phone, notes } = _req.body;
    const result = await execute(
      'INSERT INTO brenn_customers (first_name, last_name, email, phone, notes) VALUES (?, ?, ?, ?, ?)',
      [first_name, last_name, email || null, phone || null, notes || null]
    );

    const customers = await query<CustomerRow[]>(
      'SELECT * FROM brenn_customers WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(customers[0]);
  } catch (error) {
    console.error('Kunde anlegen fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// PUT /api/customers/:id
router.put('/:id', validate(customerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { first_name, last_name, email, phone, notes } = req.body;
    const result = await execute(
      'UPDATE brenn_customers SET first_name = ?, last_name = ?, email = ?, phone = ?, notes = ? WHERE id = ?',
      [first_name, last_name, email || null, phone || null, notes || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Kunde nicht gefunden' });
      return;
    }

    const customers = await query<CustomerRow[]>(
      'SELECT * FROM brenn_customers WHERE id = ?',
      [req.params.id]
    );
    res.json(customers[0]);
  } catch (error) {
    console.error('Kunde aktualisieren fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await query<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM brenn_orders WHERE customer_id = ?',
      [req.params.id]
    );

    if (orders[0].count > 0) {
      res.status(409).json({
        error: 'Kunde hat noch Aufträge und kann nicht gelöscht werden',
      });
      return;
    }

    await execute('DELETE FROM brenn_customers WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Kunde löschen fehlgeschlagen:', error);
    res.status(500).json({ error: 'Interner Fehler' });
  }
});

export default router;

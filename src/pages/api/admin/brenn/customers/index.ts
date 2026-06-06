import type { APIRoute } from 'astro';
import { getPool } from '../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../lib/server/brenn/auth';
import { validateCustomer } from '../../../../../lib/server/brenn/validation';

export const GET: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const pool = getPool();
    let where = '';
    const params: any[] = [];

    if (q) {
      where = `WHERE (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?
                OR CONCAT(c.first_name, ' ', c.last_name) LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM customers c ${where}`,
      params
    );
    const total = (countResult as any[])[0].total;

    const [rows] = await pool.execute(
      `SELECT c.*,
        (SELECT COUNT(*) FROM painted_orders po WHERE po.customer_id = c.id) as order_count
       FROM customers c ${where}
       ORDER BY c.last_name, c.first_name
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    return jsonSuccess({
      customers: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden der Kunden:', err);
    return jsonError('Kunden konnten nicht geladen werden.', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const v = validateCustomer(data);
    if (!v.valid) {
      return jsonError(v.errors.map(e => e.message).join(' '), 400);
    }

    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO customers (first_name, last_name, email, phone, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.first_name.trim(),
        data.last_name.trim(),
        data.email?.trim() || null,
        data.phone?.trim() || null,
        data.notes?.trim() || null
      ]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [insertId]);
    return jsonSuccess((rows as any[])[0], 201);
  } catch (err) {
    console.error('[Brenn] Fehler beim Erstellen des Kunden:', err);
    return jsonError('Kunde konnte nicht erstellt werden.', 500);
  }
};

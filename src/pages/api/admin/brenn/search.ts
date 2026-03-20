import type { APIRoute } from 'astro';
import { getPool } from '../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../lib/server/brenn/auth';

export const GET: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';

    if (q.length < 2) {
      return jsonSuccess({ orders: [], customers: [] });
    }

    const pool = getPool();
    const like = `%${q}%`;

    // Parallel suchen
    const [orderResults, customerResults] = await Promise.all([
      pool.execute(
        `SELECT po.id, po.reference_code, po.overall_status, po.visit_date,
          c.first_name, c.last_name
         FROM painted_orders po
         JOIN customers c ON po.customer_id = c.id
         WHERE po.reference_code LIKE ?
            OR c.first_name LIKE ?
            OR c.last_name LIKE ?
            OR CONCAT(c.first_name, ' ', c.last_name) LIKE ?
         ORDER BY po.created_at DESC
         LIMIT 10`,
        [like, like, like, like]
      ),
      pool.execute(
        `SELECT id, first_name, last_name, email, phone
         FROM customers
         WHERE first_name LIKE ?
            OR last_name LIKE ?
            OR CONCAT(first_name, ' ', last_name) LIKE ?
            OR email LIKE ?
            OR phone LIKE ?
         ORDER BY last_name, first_name
         LIMIT 10`,
        [like, like, like, like, like]
      ),
    ]);

    return jsonSuccess({
      orders: orderResults[0],
      customers: customerResults[0]
    });
  } catch (err) {
    console.error('[Brenn] Fehler bei der Suche:', err);
    return jsonError('Suche fehlgeschlagen.', 500);
  }
};

import type { APIRoute } from 'astro';
import { getPool, withTransaction } from '../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../lib/server/brenn/auth';
import { validateOrder } from '../../../../../lib/server/brenn/validation';
import { generateReferenceCode } from '../../../../../lib/server/brenn/reference';

export const GET: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const statusFilter = url.searchParams.get('status')?.trim() || '';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const pool = getPool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (q) {
      conditions.push(
        `(po.reference_code LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ?
          OR CONCAT(c.first_name, ' ', c.last_name) LIKE ?)`
      );
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    if (statusFilter) {
      const statuses = statusFilter.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        conditions.push(`po.overall_status IN (${statuses.map(() => '?').join(',')})`);
        params.push(...statuses);
      }
    }

    if (from) {
      conditions.push('po.visit_date >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('po.visit_date <= ?');
      params.push(to);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM painted_orders po
       JOIN customers c ON po.customer_id = c.id
       ${where}`,
      params
    );
    const total = (countResult as any[])[0].total;

    const [rows] = await pool.execute(
      `SELECT po.*,
        c.first_name, c.last_name, c.email, c.phone,
        sl.code as storage_code, sl.label as storage_label
       FROM painted_orders po
       JOIN customers c ON po.customer_id = c.id
       LEFT JOIN storage_locations sl ON po.storage_location_id = sl.id
       ${where}
       ORDER BY po.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, String(limit), String(offset)]
    );

    // Items für alle Aufträge laden
    const orderIds = (rows as any[]).map(r => r.id);
    let itemsByOrder: Record<number, any[]> = {};

    if (orderIds.length > 0) {
      const [items] = await pool.execute(
        `SELECT poi.*, sl.code as storage_code
         FROM painted_order_items poi
         LEFT JOIN storage_locations sl ON poi.storage_location_id = sl.id
         WHERE poi.painted_order_id IN (${orderIds.map(() => '?').join(',')})
         ORDER BY poi.id`,
        orderIds.map(String)
      );
      for (const item of items as any[]) {
        if (!itemsByOrder[item.painted_order_id]) {
          itemsByOrder[item.painted_order_id] = [];
        }
        itemsByOrder[item.painted_order_id].push(item);
      }
    }

    const orders = (rows as any[]).map(row => ({
      ...row,
      items: itemsByOrder[row.id] || []
    }));

    return jsonSuccess({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden der Aufträge:', err);
    return jsonError('Aufträge konnten nicht geladen werden.', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();

    // customer_id als Number sicherstellen
    if (data.customer_id) data.customer_id = Number(data.customer_id);
    if (data.items) {
      for (const item of data.items) {
        if (item.quantity) item.quantity = Number(item.quantity);
      }
    }

    const v = validateOrder(data);
    if (!v.valid) {
      return jsonError(v.errors.map(e => e.message).join(' '), 400);
    }

    const pool = getPool();

    // Prüfen ob Kunde existiert
    const [customerRows] = await pool.execute('SELECT id FROM customers WHERE id = ?', [data.customer_id]);
    if ((customerRows as any[]).length === 0) {
      return jsonError('Kunde nicht gefunden.', 404);
    }

    // Lagerort validieren falls angegeben
    if (data.storage_location_id) {
      const [slRows] = await pool.execute(
        'SELECT id FROM storage_locations WHERE id = ? AND is_active = 1',
        [data.storage_location_id]
      );
      if ((slRows as any[]).length === 0) {
        return jsonError('Ungültiger Lagerort.', 400);
      }
    }

    const result = await withTransaction(async (conn) => {
      const refCode = await generateReferenceCode(pool, data.visit_date);

      const [orderResult] = await conn.execute(
        `INSERT INTO painted_orders (reference_code, customer_id, visit_date, storage_location_id, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [
          refCode,
          data.customer_id,
          data.visit_date,
          data.storage_location_id || null,
          data.notes?.trim() || null
        ]
      );
      const orderId = (orderResult as any).insertId;

      // Status-Log für Auftrag
      await conn.execute(
        `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by)
         VALUES ('ORDER', ?, NULL, 'ERFASST', ?)`,
        [orderId, 'admin']
      );

      // Items anlegen
      for (const item of data.items) {
        const [itemResult] = await conn.execute(
          `INSERT INTO painted_order_items (painted_order_id, item_type, description, quantity, storage_location_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            orderId,
            item.item_type.trim(),
            item.description?.trim() || null,
            item.quantity || 1,
            data.storage_location_id || null
          ]
        );
        const itemId = (itemResult as any).insertId;

        await conn.execute(
          `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by)
           VALUES ('ITEM', ?, NULL, 'ERFASST', ?)`,
          [itemId, 'admin']
        );
      }

      return { orderId, refCode };
    });

    // Fertig erstellten Auftrag laden
    const [rows] = await pool.execute(
      `SELECT po.*, c.first_name, c.last_name
       FROM painted_orders po
       JOIN customers c ON po.customer_id = c.id
       WHERE po.id = ?`,
      [result.orderId]
    );
    const [items] = await pool.execute(
      'SELECT * FROM painted_order_items WHERE painted_order_id = ?',
      [result.orderId]
    );

    return jsonSuccess({ ...(rows as any[])[0], items }, 201);
  } catch (err) {
    console.error('[Brenn] Fehler beim Erstellen des Auftrags:', err);
    return jsonError('Auftrag konnte nicht erstellt werden.', 500);
  }
};

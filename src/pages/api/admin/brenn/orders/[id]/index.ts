import type { APIRoute } from 'astro';
import { getPool } from '../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../lib/server/brenn/auth';

export const GET: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT po.*,
        c.first_name, c.last_name, c.email, c.phone,
        sl.code as storage_code, sl.label as storage_label
       FROM painted_orders po
       JOIN customers c ON po.customer_id = c.id
       LEFT JOIN storage_locations sl ON po.storage_location_id = sl.id
       WHERE po.id = ?`,
      [params.id]
    );
    const arr = rows as any[];
    if (arr.length === 0) return jsonError('Auftrag nicht gefunden.', 404);

    // Items laden
    const [items] = await pool.execute(
      `SELECT poi.*, sl.code as storage_code, sl.label as storage_label
       FROM painted_order_items poi
       LEFT JOIN storage_locations sl ON poi.storage_location_id = sl.id
       WHERE poi.painted_order_id = ?
       ORDER BY poi.id`,
      [params.id]
    );

    // Statushistorie laden
    const [statusLog] = await pool.execute(
      `SELECT * FROM status_log
       WHERE (entity_type = 'ORDER' AND entity_id = ?)
          OR (entity_type = 'ITEM' AND entity_id IN (
            SELECT id FROM painted_order_items WHERE painted_order_id = ?
          ))
       ORDER BY created_at DESC`,
      [params.id, params.id]
    );

    // Abhol-Log laden
    const [pickupLog] = await pool.execute(
      'SELECT * FROM pickup_log WHERE painted_order_id = ? ORDER BY created_at DESC',
      [params.id]
    );

    return jsonSuccess({
      order: arr[0],
      items,
      status_log: statusLog,
      pickup_log: pickupLog
    });
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden des Auftrags:', err);
    return jsonError('Auftrag konnte nicht geladen werden.', 500);
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const pool = getPool();

    const [existing] = await pool.execute('SELECT * FROM painted_orders WHERE id = ?', [params.id]);
    if ((existing as any[]).length === 0) return jsonError('Auftrag nicht gefunden.', 404);

    const updates: string[] = [];
    const values: any[] = [];

    if (data.storage_location_id !== undefined) {
      if (data.storage_location_id !== null) {
        const [slRows] = await pool.execute(
          'SELECT id FROM storage_locations WHERE id = ? AND is_active = 1',
          [data.storage_location_id]
        );
        if ((slRows as any[]).length === 0) return jsonError('Ungültiger Lagerort.', 400);
      }
      updates.push('storage_location_id = ?');
      values.push(data.storage_location_id);
    }

    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes?.trim() || null);
    }

    if (data.pickup_notified_at !== undefined) {
      updates.push('pickup_notified_at = ?');
      values.push(data.pickup_notified_at);
    }

    if (updates.length === 0) return jsonError('Keine Änderungen angegeben.', 400);

    values.push(params.id);
    await pool.execute(
      `UPDATE painted_orders SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute('SELECT * FROM painted_orders WHERE id = ?', [params.id]);
    return jsonSuccess((rows as any[])[0]);
  } catch (err) {
    console.error('[Brenn] Fehler beim Aktualisieren des Auftrags:', err);
    return jsonError('Auftrag konnte nicht aktualisiert werden.', 500);
  }
};

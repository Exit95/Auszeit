import type { APIRoute } from 'astro';
import { getPool, withTransaction } from '../../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../../lib/server/brenn/auth';
import { validateOrderItem } from '../../../../../../../lib/server/brenn/validation';
import { calculateOverallStatus } from '../../../../../../../lib/server/brenn/status';
import type { Status } from '../../../../../../../lib/server/brenn/status';

export const POST: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const pool = getPool();

    // Auftrag prüfen
    const [orderRows] = await pool.execute('SELECT * FROM painted_orders WHERE id = ?', [params.id]);
    if ((orderRows as any[]).length === 0) return jsonError('Auftrag nicht gefunden.', 404);

    // Items können einzeln oder als Array kommen
    const itemsData = Array.isArray(data) ? data : [data];

    for (const item of itemsData) {
      if (item.quantity) item.quantity = Number(item.quantity);
      const v = validateOrderItem(item);
      if (!v.valid) {
        return jsonError(v.errors.map(e => e.message).join(' '), 400);
      }
    }

    const result = await withTransaction(async (conn) => {
      const insertedIds: number[] = [];

      for (const item of itemsData) {
        const [itemResult] = await conn.execute(
          `INSERT INTO painted_order_items (painted_order_id, item_type, description, quantity, storage_location_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            params.id,
            item.item_type.trim(),
            item.description?.trim() || null,
            item.quantity || 1,
            item.storage_location_id || null
          ]
        );
        const itemId = (itemResult as any).insertId;
        insertedIds.push(itemId);

        await conn.execute(
          `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by)
           VALUES ('ITEM', ?, NULL, 'ERFASST', ?)`,
          [itemId, 'admin']
        );
      }

      // Overall-Status neu berechnen
      const [allItems] = await conn.execute(
        'SELECT status FROM painted_order_items WHERE painted_order_id = ?',
        [params.id]
      );
      const newOverall = calculateOverallStatus(allItems as { status: Status }[]);
      await conn.execute(
        'UPDATE painted_orders SET overall_status = ? WHERE id = ?',
        [newOverall, params.id]
      );

      return insertedIds;
    });

    const [items] = await pool.execute(
      'SELECT * FROM painted_order_items WHERE id IN (' + result.map(() => '?').join(',') + ')',
      result.map(String)
    );
    return jsonSuccess(items, 201);
  } catch (err) {
    console.error('[Brenn] Fehler beim Hinzufügen von Werkstücken:', err);
    return jsonError('Werkstücke konnten nicht hinzugefügt werden.', 500);
  }
};

import type { APIRoute } from 'astro';
import { getPool, withTransaction } from '../../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../../lib/server/brenn/auth';
import { isValidTransition, isValidStatus, calculateOverallStatus } from '../../../../../../../lib/server/brenn/status';
import { validateBulkStatus } from '../../../../../../../lib/server/brenn/validation';
import type { Status } from '../../../../../../../lib/server/brenn/status';

export const PATCH: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();

    // IDs als Numbers sicherstellen
    if (data.item_ids) data.item_ids = data.item_ids.map(Number);

    const v = validateBulkStatus(data);
    if (!v.valid) {
      return jsonError(v.errors.map(e => e.message).join(' '), 400);
    }

    const newStatus = data.new_status as Status;
    if (!isValidStatus(newStatus)) {
      return jsonError('Ungültiger Status.', 400);
    }

    const pool = getPool();

    // Auftrag prüfen
    const [orderRows] = await pool.execute('SELECT * FROM painted_orders WHERE id = ?', [params.id]);
    if ((orderRows as any[]).length === 0) return jsonError('Auftrag nicht gefunden.', 404);

    // Items laden
    const placeholders = data.item_ids.map(() => '?').join(',');
    const [itemRows] = await pool.execute(
      `SELECT * FROM painted_order_items WHERE id IN (${placeholders}) AND painted_order_id = ?`,
      [...data.item_ids.map(String), params.id]
    );
    const items = itemRows as any[];

    if (items.length !== data.item_ids.length) {
      return jsonError('Einige Werkstücke wurden nicht gefunden.', 404);
    }

    // Alle Items müssen denselben Status haben
    const uniqueStatuses = [...new Set(items.map(i => i.status))];
    if (uniqueStatuses.length > 1) {
      return jsonError('Alle ausgewählten Werkstücke müssen denselben aktuellen Status haben.', 400);
    }

    const currentStatus = uniqueStatuses[0] as Status;

    // Transition für jedes Item prüfen
    for (const item of items) {
      if (!isValidTransition(item.status as Status, newStatus, item.previous_status as Status | null)) {
        return jsonError(
          `Statuswechsel von "${currentStatus}" nach "${newStatus}" ist nicht erlaubt.`,
          400
        );
      }
    }

    await withTransaction(async (conn) => {
      for (const item of items) {
        const updateFields: string[] = ['status = ?'];
        const updateValues: any[] = [newStatus];

        if (newStatus === 'PROBLEM') {
          updateFields.push('previous_status = ?');
          updateValues.push(item.status);
        } else if (item.status === 'PROBLEM') {
          updateFields.push('previous_status = NULL');
        }

        if (data.storage_location_id !== undefined) {
          updateFields.push('storage_location_id = ?');
          updateValues.push(data.storage_location_id);
        }

        updateValues.push(item.id);
        await conn.execute(
          `UPDATE painted_order_items SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        await conn.execute(
          `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by)
           VALUES ('ITEM', ?, ?, ?, ?)`,
          [item.id, item.status, newStatus, 'admin']
        );
      }

      // Overall-Status neu berechnen
      const [allItems] = await conn.execute(
        'SELECT status FROM painted_order_items WHERE painted_order_id = ?',
        [params.id]
      );
      const newOverall = calculateOverallStatus(allItems as { status: Status }[]);

      const [orderData] = await conn.execute('SELECT overall_status FROM painted_orders WHERE id = ?', [params.id]);
      const oldOverall = (orderData as any[])[0]?.overall_status;

      if (oldOverall !== newOverall) {
        await conn.execute(
          'UPDATE painted_orders SET overall_status = ? WHERE id = ?',
          [newOverall, params.id]
        );
        await conn.execute(
          `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
           VALUES ('ORDER', ?, ?, ?, ?, ?)`,
          [params.id, oldOverall, newOverall, 'admin', 'Automatisch berechnet (Bulk)']
        );
      }
    });

    // Aktualisierte Items zurückgeben
    const [updated] = await pool.execute(
      `SELECT * FROM painted_order_items WHERE id IN (${placeholders})`,
      data.item_ids.map(String)
    );
    return jsonSuccess(updated);
  } catch (err) {
    console.error('[Brenn] Fehler beim Bulk-Statuswechsel:', err);
    return jsonError('Bulk-Statuswechsel fehlgeschlagen.', 500);
  }
};

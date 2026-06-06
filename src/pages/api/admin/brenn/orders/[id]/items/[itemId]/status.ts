import type { APIRoute } from 'astro';
import { getPool, withTransaction } from '../../../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../../../lib/server/brenn/auth';
import { isValidTransition, isValidStatus, calculateOverallStatus } from '../../../../../../../../lib/server/brenn/status';
import type { Status } from '../../../../../../../../lib/server/brenn/status';

export const PATCH: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const newStatus = data.new_status as string;
    const note = data.note?.trim() || null;

    if (!newStatus || !isValidStatus(newStatus)) {
      return jsonError('Ungültiger Status.', 400);
    }

    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT * FROM painted_order_items WHERE id = ? AND painted_order_id = ?',
      [params.itemId, params.id]
    );
    const item = (rows as any[])[0];
    if (!item) return jsonError('Werkstück nicht gefunden.', 404);

    const currentStatus = item.status as Status;
    const previousStatus = item.previous_status as Status | null;

    if (!isValidTransition(currentStatus, newStatus as Status, previousStatus)) {
      return jsonError(
        `Statuswechsel von "${currentStatus}" nach "${newStatus}" ist nicht erlaubt.`,
        400
      );
    }

    await withTransaction(async (conn) => {
      const updateFields: string[] = ['status = ?'];
      const updateValues: any[] = [newStatus];

      if (newStatus === 'PROBLEM') {
        updateFields.push('previous_status = ?');
        updateValues.push(currentStatus);
      } else if (currentStatus === 'PROBLEM') {
        updateFields.push('previous_status = NULL');
      }

      // Lagerort setzen falls mitgeschickt
      if (data.storage_location_id !== undefined) {
        updateFields.push('storage_location_id = ?');
        updateValues.push(data.storage_location_id);
      }

      updateValues.push(params.itemId);
      await conn.execute(
        `UPDATE painted_order_items SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Status-Log
      await conn.execute(
        `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
         VALUES ('ITEM', ?, ?, ?, ?, ?)`,
        [params.itemId, currentStatus, newStatus, 'admin', note]
      );

      // Overall-Status des Auftrags neu berechnen
      const [allItems] = await conn.execute(
        'SELECT status FROM painted_order_items WHERE painted_order_id = ?',
        [params.id]
      );
      const newOverall = calculateOverallStatus(allItems as { status: Status }[]);

      const [orderRows] = await conn.execute('SELECT overall_status FROM painted_orders WHERE id = ?', [params.id]);
      const oldOverall = (orderRows as any[])[0]?.overall_status;

      if (oldOverall !== newOverall) {
        await conn.execute(
          'UPDATE painted_orders SET overall_status = ? WHERE id = ?',
          [newOverall, params.id]
        );
        await conn.execute(
          `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
           VALUES ('ORDER', ?, ?, ?, ?, ?)`,
          [params.id, oldOverall, newOverall, 'admin', 'Automatisch berechnet']
        );
      }
    });

    const [updated] = await pool.execute('SELECT * FROM painted_order_items WHERE id = ?', [params.itemId]);
    return jsonSuccess((updated as any[])[0]);
  } catch (err) {
    console.error('[Brenn] Fehler beim Statuswechsel:', err);
    return jsonError('Statuswechsel fehlgeschlagen.', 500);
  }
};

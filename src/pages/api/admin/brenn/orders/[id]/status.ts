import type { APIRoute } from 'astro';
import { getPool, withTransaction } from '../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../lib/server/brenn/auth';
import { isValidTransition, isValidStatus, calculateOverallStatus } from '../../../../../../lib/server/brenn/status';
import type { Status } from '../../../../../../lib/server/brenn/status';

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
    const [rows] = await pool.execute('SELECT * FROM painted_orders WHERE id = ?', [params.id]);
    const order = (rows as any[])[0];
    if (!order) return jsonError('Auftrag nicht gefunden.', 404);

    const currentStatus = order.overall_status as Status;
    const previousStatus = order.previous_status as Status | null;

    if (!isValidTransition(currentStatus, newStatus as Status, previousStatus)) {
      return jsonError(
        `Statuswechsel von "${currentStatus}" nach "${newStatus}" ist nicht erlaubt.`,
        400
      );
    }

    await withTransaction(async (conn) => {
      const updateFields: string[] = ['overall_status = ?'];
      const updateValues: any[] = [newStatus];

      if (newStatus === 'PROBLEM') {
        updateFields.push('previous_status = ?');
        updateValues.push(currentStatus);
      } else if (currentStatus === 'PROBLEM') {
        updateFields.push('previous_status = NULL');
      }

      updateValues.push(params.id);
      await conn.execute(
        `UPDATE painted_orders SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      await conn.execute(
        `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
         VALUES ('ORDER', ?, ?, ?, ?, ?)`,
        [params.id, currentStatus, newStatus, 'admin', note]
      );
    });

    const [updated] = await pool.execute('SELECT * FROM painted_orders WHERE id = ?', [params.id]);
    return jsonSuccess((updated as any[])[0]);
  } catch (err) {
    console.error('[Brenn] Fehler beim Statuswechsel:', err);
    return jsonError('Statuswechsel fehlgeschlagen.', 500);
  }
};

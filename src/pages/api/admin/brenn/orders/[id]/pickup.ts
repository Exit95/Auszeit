import type { APIRoute } from 'astro';
import { getPool, withTransaction } from '../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../lib/server/brenn/auth';
import { validatePickup } from '../../../../../../lib/server/brenn/validation';
import { sendReviewRequestEmail } from '../../../../../../lib/server/brenn/notifications';

export const POST: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const v = validatePickup(data);
    if (!v.valid) {
      return jsonError(v.errors.map(e => e.message).join(' '), 400);
    }

    const pool = getPool();

    // Kundendaten gleich mitladen — werden nach der Transaktion für die
    // Bewertungs-E-Mail benötigt (Feature 12).
    const [orderRows] = await pool.execute(
      `SELECT po.*, c.first_name, c.last_name, c.email AS customer_email,
              po.review_email_sent_at
         FROM painted_orders po
         JOIN customers c ON c.id = po.customer_id
        WHERE po.id = ?`,
      [params.id]
    );
    const order = (orderRows as any[])[0];
    if (!order) return jsonError('Auftrag nicht gefunden.', 404);

    if (order.overall_status !== 'ABHOLBEREIT') {
      return jsonError('Abholung ist nur bei Status "Abholbereit" möglich.', 400);
    }

    await withTransaction(async (conn) => {
      // Alle Items auf ABGEHOLT setzen
      const [items] = await conn.execute(
        'SELECT * FROM painted_order_items WHERE painted_order_id = ?',
        [params.id]
      );

      for (const item of items as any[]) {
        if (item.status === 'ABHOLBEREIT' || item.status === 'PROBLEM') {
          await conn.execute(
            'UPDATE painted_order_items SET status = ?, previous_status = NULL WHERE id = ?',
            ['ABGEHOLT', item.id]
          );
          await conn.execute(
            `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
             VALUES ('ITEM', ?, ?, 'ABGEHOLT', ?, ?)`,
            [item.id, item.status, 'admin', 'Abholung durchgeführt']
          );
        }
      }

      // Auftrag auf ABGEHOLT setzen
      await conn.execute(
        'UPDATE painted_orders SET overall_status = ?, previous_status = NULL WHERE id = ?',
        ['ABGEHOLT', params.id]
      );
      await conn.execute(
        `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
         VALUES ('ORDER', ?, ?, 'ABGEHOLT', ?, ?)`,
        [params.id, order.overall_status, 'admin', 'Abholung durchgeführt']
      );

      // Pickup-Log erstellen
      await conn.execute(
        'INSERT INTO pickup_log (painted_order_id, picked_up_by, pickup_note) VALUES (?, ?, ?)',
        [params.id, data.picked_up_by.trim(), data.pickup_note?.trim() || null]
      );
    });

    // Feature 12: Bewertungs-E-Mail (fire-and-forget).
    // Nur senden wenn: E-Mail vorhanden, noch nicht gesendet, Auftrag nicht storniert.
    if (order.customer_email && !order.review_email_sent_at) {
      const custName = `${order.first_name ?? ''} ${order.last_name ?? ''}`.trim();
      sendReviewRequestEmail({
        orderId: order.id,
        customerName: custName,
        customerEmail: order.customer_email,
        referenceCode: order.reference_code,
      }).catch((err) =>
        console.error('[Brenn-Pickup] Bewertungsmail Fehler:', err)
      );
    }

    return jsonSuccess({ picked_up: true });
  } catch (err) {
    console.error('[Brenn] Fehler bei der Abholung:', err);
    return jsonError('Abholung konnte nicht durchgeführt werden.', 500);
  }
};

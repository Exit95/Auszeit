import type { APIRoute } from 'astro';
import { getPool } from '../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../lib/server/brenn/auth';
import { sendPickupReadyEmail } from '../../../../../../lib/server/brenn/notifications';

/**
 * Sendet die Abholbenachrichtigung (erneut) an die Kund:in.
 * Idempotent: überschreibt pickup_notified_at mit dem aktuellen Zeitpunkt.
 * Wird in der App vom Button "Erinnerung senden" auf dem OrderDetailScreen genutzt.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();

    // Auftrag inkl. Kunde + Lagerort laden
    const [rows] = await pool.execute(
      `SELECT po.id, po.reference_code, po.overall_status, po.pickup_notified_at,
        c.first_name, c.last_name, c.email,
        sl.code as storage_code
       FROM painted_orders po
       JOIN customers c ON po.customer_id = c.id
       LEFT JOIN storage_locations sl ON po.storage_location_id = sl.id
       WHERE po.id = ?`,
      [params.id]
    );
    const order = (rows as any[])[0];
    if (!order) return jsonError('Auftrag nicht gefunden.', 404);

    if (order.overall_status !== 'ABHOLBEREIT') {
      return jsonError('Eine Erinnerung kann nur bei Status "Abholbereit" gesendet werden.', 400);
    }

    const customerName = `${order.first_name ?? ''} ${order.last_name ?? ''}`.trim();
    if (!order.email) {
      return jsonError('Für diese Kund:in ist keine E-Mail-Adresse hinterlegt.', 400);
    }

    // sendPickupReadyEmail setzt pickup_notified_at = NOW() bei Erfolg.
    const sent = await sendPickupReadyEmail({
      orderId: order.id,
      customerName,
      customerEmail: order.email,
      referenceCode: order.reference_code,
      storageCode: order.storage_code || undefined,
    });

    if (!sent) {
      return jsonError('E-Mail konnte nicht gesendet werden (SMTP nicht konfiguriert oder Fehler).', 502);
    }

    // Aktualisierten Zeitstempel zurückgeben
    const [updated] = await pool.execute(
      'SELECT pickup_notified_at FROM painted_orders WHERE id = ?',
      [params.id]
    );
    const pickupNotifiedAt = (updated as any[])[0]?.pickup_notified_at ?? null;

    return jsonSuccess({ sent: true, pickup_notified_at: pickupNotifiedAt });
  } catch (err) {
    console.error('[Brenn] Fehler beim erneuten Senden der Abholbenachrichtigung:', err);
    return jsonError('Erinnerung konnte nicht gesendet werden.', 500);
  }
};

import type { APIRoute } from 'astro';
import { getPool, withTransaction } from '../../../../lib/database';
import { jsonSuccess, jsonError, checkAuth } from '../../../../lib/server/brenn/auth';
import { sendPickupReadyEmail } from '../../../../lib/server/brenn/notifications';
import { notifyOrderReady } from '../../../../lib/push-notifications';
import { getTimerSecret, BRENN_AUTO_HOURS } from '../../../../lib/timer-scheduler';

/**
 * Verarbeitet den 24h-Brennofen-Timer.
 *
 * Sucht alle Aufträge im Status IM_BRENNOFEN, deren brenn_started_at älter als
 * BRENN_AUTO_HOURS (24h) ist, setzt sie automatisch auf ABHOLBEREIT und löst
 * Push-Notification (an Irena) + Abholbereit-E-Mail (an Kundin) aus.
 *
 * Auth: Entweder Basic-Auth (Admin, wie alle Brenn-Endpoints) ODER der interne
 * Secret-Header X-Internal-Secret, mit dem der Scheduler (timer-scheduler.ts)
 * den Endpoint per Self-Call triggert, ohne Admin-Credentials zu kennen.
 *
 * Idempotent: greift nur Aufträge mit gültigem brenn_started_at < NOW()-24h auf
 * und setzt den Timer beim Statuswechsel zurück (brenn_started_at = NULL).
 */
function isAuthorized(request: Request): boolean {
  // 1) Interner Secret-Header (Scheduler-Self-Call)
  const internalSecret = request.headers.get('X-Internal-Secret');
  if (internalSecret && internalSecret === getTimerSecret()) {
    return true;
  }
  // 2) Regulärer Admin-Basic-Auth (manueller Aufruf / Cron von außen)
  return checkAuth(request);
}

async function processTimers() {
  const pool = getPool();

  // Fällige Aufträge laden: IM_BRENNOFEN + brenn_started_at älter als 24h.
  // Kundendaten + Lagerort gleich mitladen für Push & E-Mail.
  const [rows] = await pool.execute(
    `SELECT po.id, po.reference_code, po.storage_location_id, po.pickup_notified_at,
            c.first_name, c.last_name, c.email,
            sl.code AS storage_code
       FROM painted_orders po
       JOIN customers c ON c.id = po.customer_id
       LEFT JOIN storage_locations sl ON sl.id = po.storage_location_id
      WHERE po.overall_status = 'IM_BRENNOFEN'
        AND po.brenn_started_at IS NOT NULL
        AND po.brenn_started_at < (NOW() - INTERVAL ? HOUR)`,
    [BRENN_AUTO_HOURS]
  );

  const due = rows as any[];
  const processed: number[] = [];

  for (const order of due) {
    try {
      // Statuswechsel + zwei Log-Einträge in einer Transaktion.
      // IM_BRENNOFEN -> ABHOLBEREIT ist ein bewusster Auto-Sprung (überspringt
      // GEBRANNT). Wir protokollieren beide Schritte, damit die Historie
      // nachvollziehbar bleibt, und entwerten den Timer (brenn_started_at = NULL).
      await withTransaction(async (conn) => {
        await conn.execute(
          `UPDATE painted_orders
              SET overall_status = 'ABHOLBEREIT', brenn_started_at = NULL
            WHERE id = ? AND overall_status = 'IM_BRENNOFEN'`,
          [order.id]
        );
        await conn.execute(
          `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
           VALUES ('ORDER', ?, 'IM_BRENNOFEN', 'GEBRANNT', 'system', ?)`,
          [order.id, `Auto-Timer nach ${BRENN_AUTO_HOURS}h`]
        );
        await conn.execute(
          `INSERT INTO status_log (entity_type, entity_id, old_status, new_status, changed_by, note)
           VALUES ('ORDER', ?, 'GEBRANNT', 'ABHOLBEREIT', 'system', ?)`,
          [order.id, `Auto-Timer nach ${BRENN_AUTO_HOURS}h`]
        );
      });

      const custName = `${order.first_name ?? ''} ${order.last_name ?? ''}`.trim();

      // Push an Irena
      notifyOrderReady(order.id, order.reference_code, custName || undefined).catch((err) =>
        console.error('[Brenn-Timer] Push notifyOrderReady Fehler:', err)
      );

      // Abholbereit-E-Mail an Kundin (setzt selbst pickup_notified_at), nur wenn
      // noch nicht benachrichtigt und E-Mail vorhanden.
      if (order.email && !order.pickup_notified_at) {
        sendPickupReadyEmail({
          orderId: order.id,
          customerName: custName,
          customerEmail: order.email,
          referenceCode: order.reference_code,
          storageCode: order.storage_code ?? undefined,
        }).catch((err) => console.error('[Brenn-Timer] Pickup-Email Fehler:', err));
      }

      processed.push(order.id);
      console.log(
        `[Brenn-Timer] Auftrag ${order.reference_code} (#${order.id}) automatisch auf ABHOLBEREIT gesetzt.`
      );
    } catch (err) {
      console.error(`[Brenn-Timer] Fehler bei Auftrag #${order.id}:`, err);
    }
  }

  return { checked: due.length, processed: processed.length, orderIds: processed };
}

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return jsonError('Unauthorized', 401);
  try {
    const result = await processTimers();
    return jsonSuccess(result);
  } catch (err) {
    console.error('[Brenn-Timer] process-timers fehlgeschlagen:', err);
    return jsonError('Timer-Verarbeitung fehlgeschlagen.', 500);
  }
};

// GET zum manuellen Triggern/Debuggen (gleiche Auth).
export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return jsonError('Unauthorized', 401);
  try {
    const result = await processTimers();
    return jsonSuccess(result);
  } catch (err) {
    console.error('[Brenn-Timer] process-timers fehlgeschlagen:', err);
    return jsonError('Timer-Verarbeitung fehlgeschlagen.', 500);
  }
};

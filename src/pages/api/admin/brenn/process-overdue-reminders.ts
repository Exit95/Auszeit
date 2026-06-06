import type { APIRoute } from 'astro';
import { getPool } from '../../../../lib/database';
import { jsonSuccess, jsonError, checkAuth } from '../../../../lib/server/brenn/auth';
import { sendPickupReminderEmail } from '../../../../lib/server/brenn/notifications';
import { getTimerSecret } from '../../../../lib/timer-scheduler';

/**
 * Verarbeitet überfällige Abholungs-Erinnerungen (Feature 8).
 *
 * Zeitplan (Basis: pickup_notified_at):
 *   14 Tage ohne Abholung → erste freundliche Erinnerung  (reminder_1_sent_at)
 *   35 Tage ohne Abholung → letzte Erinnerung vor Spende  (reminder_2_sent_at)
 *
 * Idempotent: reminder_N_sent_at-Guard verhindert Mehrfach-Versand.
 *
 * Auth: interner X-Internal-Secret-Header (Scheduler) oder regulärer Admin-Login.
 */

/** Tage nach pickup_notified_at bis erste Erinnerung. */
const REMINDER_1_DAYS = 14;
/** Tage nach pickup_notified_at bis zweite (letzte) Erinnerung. */
const REMINDER_2_DAYS = 35;

function isAuthorized(request: Request): boolean {
  const internalSecret = request.headers.get('X-Internal-Secret');
  if (internalSecret && internalSecret === getTimerSecret()) return true;
  return checkAuth(request);
}

interface ReminderCandidate {
  id: number;
  reference_code: string;
  pickup_notified_at: Date | null;
  reminder_1_sent_at: Date | null;
  reminder_2_sent_at: Date | null;
  first_name: string;
  last_name: string;
  email: string | null;
}

async function processOverdueReminders(): Promise<{
  checked: number;
  reminder1Sent: number;
  reminder2Sent: number;
}> {
  const pool = getPool();

  // Alle ABHOLBEREIT-Aufträge mit pickup_notified_at laden.
  // Wir filtern bewusst großzügig in SQL (nur Status + notified_at IS NOT NULL)
  // und entscheiden die genaue Stufe in TypeScript, damit die Logik gut testbar bleibt.
  const [rows] = await pool.execute(
    `SELECT po.id, po.reference_code, po.pickup_notified_at,
            po.reminder_1_sent_at, po.reminder_2_sent_at,
            c.first_name, c.last_name, c.email
       FROM painted_orders po
       JOIN customers c ON c.id = po.customer_id
      WHERE po.overall_status = 'ABHOLBEREIT'
        AND po.pickup_notified_at IS NOT NULL
        AND c.email IS NOT NULL
        AND c.email != ''`
  );

  const candidates = rows as ReminderCandidate[];
  const now = new Date();

  let reminder1Sent = 0;
  let reminder2Sent = 0;

  for (const order of candidates) {
    const notifiedAt = order.pickup_notified_at ? new Date(order.pickup_notified_at) : null;
    if (!notifiedAt) continue;

    const daysSinceNotified = Math.floor(
      (now.getTime() - notifiedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const custName = `${order.first_name ?? ''} ${order.last_name ?? ''}`.trim();

    // Zweite Erinnerung: 35+ Tage, noch nicht gesendet
    if (daysSinceNotified >= REMINDER_2_DAYS && !order.reminder_2_sent_at) {
      const ok = await sendPickupReminderEmail({
        orderId: order.id,
        customerName: custName,
        customerEmail: order.email!,
        referenceCode: order.reference_code,
        step: 2,
      }).catch((err) => {
        console.error(`[Overdue-Reminders] Fehler Erinnerung 2 für #${order.id}:`, err);
        return false;
      });
      if (ok) {
        reminder2Sent++;
        console.log(`[Overdue-Reminders] Erinnerung 2 → Auftrag ${order.reference_code} (${daysSinceNotified}d überfällig)`);
      }
      continue; // keine Erinnerung 1 mehr nötig
    }

    // Erste Erinnerung: 14+ Tage, noch nicht gesendet
    if (daysSinceNotified >= REMINDER_1_DAYS && !order.reminder_1_sent_at) {
      const ok = await sendPickupReminderEmail({
        orderId: order.id,
        customerName: custName,
        customerEmail: order.email!,
        referenceCode: order.reference_code,
        step: 1,
      }).catch((err) => {
        console.error(`[Overdue-Reminders] Fehler Erinnerung 1 für #${order.id}:`, err);
        return false;
      });
      if (ok) {
        reminder1Sent++;
        console.log(`[Overdue-Reminders] Erinnerung 1 → Auftrag ${order.reference_code} (${daysSinceNotified}d überfällig)`);
      }
    }
  }

  return { checked: candidates.length, reminder1Sent, reminder2Sent };
}

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return jsonError('Unauthorized', 401);
  try {
    const result = await processOverdueReminders();
    return jsonSuccess(result);
  } catch (err) {
    console.error('[Overdue-Reminders] Fehler:', err);
    return jsonError('Verarbeitung fehlgeschlagen.', 500);
  }
};

// GET für manuelles Triggern / Debugging
export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) return jsonError('Unauthorized', 401);
  try {
    const result = await processOverdueReminders();
    return jsonSuccess(result);
  } catch (err) {
    console.error('[Overdue-Reminders] Fehler:', err);
    return jsonError('Verarbeitung fehlgeschlagen.', 500);
  }
};

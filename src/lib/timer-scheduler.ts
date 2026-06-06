/**
 * Timer-Scheduler für den 24h-Brennofen-Auto-Status
 * und überfällige Abholungs-Erinnerungen.
 *
 * Astro SSR (Node standalone) hat keinen nativen Cron. Wir starten beim ersten
 * Request nach Server-Start einen setInterval, der alle 5 Minuten den Endpoint
 * /api/admin/brenn/process-timers per Self-Call (fetch) triggert. Der Endpoint
 * setzt fällige IM_BRENNOFEN-Aufträge auf ABHOLBEREIT und feuert Push + E-Mail.
 *
 * Zusätzlich wird alle 6 Stunden /api/admin/brenn/process-overdue-reminders
 * aufgerufen (Feature 8: Erinnerungs-Mails nach 14 / 35 Tagen ohne Abholung).
 *
 * Der Self-Call authentifiziert sich über den internen Secret-Header
 * X-Internal-Secret (kein Admin-Login nötig).
 */

import { getEnv } from './env';

/** Stunden, nach denen ein Auftrag im Brennofen automatisch abholbereit wird. */
export const BRENN_AUTO_HOURS = 24;

/** Intervall des Self-Calls in Millisekunden (5 Minuten). */
const INTERVAL_MS = 5 * 60 * 1000;

/** Intervall für den Erinnerungs-Check in Millisekunden (6 Stunden). */
const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Geheimnis für den internen Self-Call. Bevorzugt TIMER_SECRET; fällt auf
 * ADMIN_PASSWORD zurück, damit der Scheduler ohne zusätzliches Secret läuft.
 */
export function getTimerSecret(): string {
  return getEnv('TIMER_SECRET') || getEnv('ADMIN_PASSWORD') || 'auszeit-internal-timer';
}

/**
 * Interner Host für den Self-Call. Innerhalb des Containers auf localhost,
 * damit kein externes DNS/TLS (und keine Hairpin-Probleme) im Spiel sind.
 * Überschreibbar via INTERNAL_API_HOST.
 */
function getInternalHost(): string {
  return getEnv('INTERNAL_API_HOST', 'http://127.0.0.1:3000');
}

// Modul-Level-Guard: Interval nur einmal pro Prozess starten.
let started = false;

async function runTimerOnce(): Promise<void> {
  const url = `${getInternalHost()}/api/admin/brenn/process-timers`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': getTimerSecret(),
      },
    });
    if (!res.ok) {
      console.error(`[Timer-Scheduler] Self-Call ${res.status} ${res.statusText}`);
      return;
    }
    const body = (await res.json().catch(() => null)) as
      | { data?: { checked?: number; processed?: number } }
      | null;
    const processed = body?.data?.processed ?? 0;
    if (processed > 0) {
      console.log(`[Timer-Scheduler] ${processed} Auftrag/Aufträge automatisch auf ABHOLBEREIT gesetzt.`);
    }
  } catch (err) {
    // Beim Server-Start kann der erste Call fehlschlagen, bevor der HTTP-Server
    // lauscht — unkritisch, der nächste Tick greift.
    console.error('[Timer-Scheduler] Self-Call fehlgeschlagen:', (err as Error)?.message);
  }
}

async function runOverdueRemindersOnce(): Promise<void> {
  const url = `${getInternalHost()}/api/admin/brenn/process-overdue-reminders`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': getTimerSecret(),
      },
    });
    if (!res.ok) {
      console.error(`[Timer-Scheduler] Erinnerungs-Call ${res.status} ${res.statusText}`);
      return;
    }
    const body = (await res.json().catch(() => null)) as
      | { data?: { reminder1Sent?: number; reminder2Sent?: number } }
      | null;
    const r1 = body?.data?.reminder1Sent ?? 0;
    const r2 = body?.data?.reminder2Sent ?? 0;
    if (r1 + r2 > 0) {
      console.log(`[Timer-Scheduler] Erinnerungen: ${r1}x erste, ${r2}x letzte Erinnerung gesendet.`);
    }
  } catch (err) {
    console.error('[Timer-Scheduler] Erinnerungs-Call fehlgeschlagen:', (err as Error)?.message);
  }
}

/**
 * Startet den Scheduler (idempotent). Wird aus der Middleware beim ersten
 * Request aufgerufen. Nur in der Node-Laufzeit aktiv (kein Build, kein Browser).
 */
export function startTimerScheduler(): void {
  if (started) return;
  if (typeof setInterval !== 'function') return;
  started = true;

  console.log(
    `[Timer-Scheduler] Aktiv: prüft alle ${INTERVAL_MS / 60000} min Brennofen-Aufträge (Auto-Abholbereit nach ${BRENN_AUTO_HOURS}h).`
  );
  console.log(
    `[Timer-Scheduler] Erinnerungen: prüft alle ${REMINDER_INTERVAL_MS / 3600000}h auf überfällige Abholungen.`
  );

  // Erster Lauf leicht verzögert, damit der HTTP-Server sicher lauscht.
  setTimeout(() => {
    runTimerOnce().catch(() => undefined);
  }, 30 * 1000).unref?.();

  // Erster Erinnerungs-Lauf nach 2 Minuten (nach dem Timer-Lauf, nicht gleichzeitig).
  setTimeout(() => {
    runOverdueRemindersOnce().catch(() => undefined);
  }, 2 * 60 * 1000).unref?.();

  const handle = setInterval(() => {
    runTimerOnce().catch(() => undefined);
  }, INTERVAL_MS);

  const reminderHandle = setInterval(() => {
    runOverdueRemindersOnce().catch(() => undefined);
  }, REMINDER_INTERVAL_MS);

  // Prozess-Shutdown nicht blockieren.
  handle.unref?.();
  reminderHandle.unref?.();
}

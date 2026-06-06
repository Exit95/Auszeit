// Push-Notifications via Expo Push API
// Tokens werden in der DB gespeichert, Notifications werden bei neuen Buchungen gesendet

import { execute, query } from './database';
import type { RowDataPacket } from 'mysql2/promise';

interface PushToken {
  token: string;
  platform: string;
  createdAt: string;
}

// ─── Token-Verwaltung ──────────────────────────────────────────────────────────

export async function savePushToken(token: string, platform: string): Promise<void> {
  try {
    await execute(
      `INSERT INTO push_tokens (token, platform, created_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE platform = VALUES(platform), updated_at = NOW()`,
      [token, platform]
    );
    console.log(`[Push] Token registriert: ${token.substring(0, 20)}... (${platform})`);
  } catch (err) {
    console.error('[Push] savePushToken DB-Fehler:', err);
  }
}

export async function getPushTokens(): Promise<PushToken[]> {
  try {
    const rows = await query<RowDataPacket[]>(
      'SELECT token, platform, created_at FROM push_tokens ORDER BY created_at DESC'
    );
    return rows.map(r => ({
      token: r.token,
      platform: r.platform,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch (err) {
    console.error('[Push] getPushTokens DB-Fehler:', err);
    return [];
  }
}

// ─── Notification senden ───────────────────────────────────────────────────────

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(message: PushMessage): Promise<void> {
  const tokens = await getPushTokens();

  if (tokens.length === 0) {
    console.log('[Push] Keine registrierten Geräte');
    return;
  }

  const messages = tokens.map(t => ({
    to: t.token,
    sound: 'default' as const,
    title: message.title,
    body: message.body,
    data: message.data || {},
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log(`[Push] ${messages.length} Notification(s) gesendet:`, result);
  } catch (error) {
    console.error('[Push] Senden fehlgeschlagen:', error);
  }
}

// ─── Vorgefertigte Notifications ────────────────────────────────────────────────

export async function notifyNewBooking(name: string, participants: number, date?: string, time?: string): Promise<void> {
  const dateStr = date ? ` am ${formatDateDE(date)}` : '';
  const timeStr = time ? ` um ${time.substring(0, 5)} Uhr` : '';

  await sendPushNotification({
    title: '📋 Neue Buchung',
    body: `${name} (${participants} Pers.)${dateStr}${timeStr}`,
    data: { type: 'booking', action: 'new' },
  });
}

export async function notifyBookingCancelled(name: string, date?: string): Promise<void> {
  const dateStr = date ? ` (${formatDateDE(date)})` : '';

  await sendPushNotification({
    title: '❌ Stornierung',
    body: `${name}${dateStr} hat storniert`,
    data: { type: 'booking', action: 'cancelled' },
  });
}

export async function notifyNewInquiry(name: string, eventType: string): Promise<void> {
  const typeMap: Record<string, string> = {
    kindergeburtstag: 'Kindergeburtstag',
    jga: 'JGA',
    stammtisch: 'Stammtisch',
    firmen: 'Firmenevent',
    other: 'Sonstiges',
  };

  await sendPushNotification({
    title: '✉️ Neue Anfrage',
    body: `${name} — ${typeMap[eventType] || eventType}`,
    data: { type: 'inquiry', action: 'new' },
  });
}

function formatDateDE(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

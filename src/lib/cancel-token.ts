import crypto from 'crypto';
import { getEnv } from './env';

/**
 * Erzeugt ein Stornierungstoken basierend auf der Buchungs-ID.
 * Nutzt HMAC-SHA256 mit einem serverseitigen Geheimnis.
 * Kein Datenbank-Eintrag nötig - das Token ist deterministisch.
 */
function getSecret(): string {
  // Nutze ADMIN_PASSWORD als Basis-Secret, kombiniert mit einem festen Salt
  const adminPw = process.env.ADMIN_PASSWORD || 'auszeit-default-secret';
  return `cancel-token-salt-${adminPw}`;
}

export function generateCancelToken(bookingId: string): string {
  const hmac = crypto.createHmac('sha256', getSecret());
  hmac.update(bookingId);
  return hmac.digest('hex').substring(0, 32); // 32 Zeichen reichen
}

export function verifyCancelToken(bookingId: string, token: string): boolean {
  const expected = generateCancelToken(bookingId);
  // Timing-safe comparison
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * Erzeugt den vollen Stornierungslink für eine Buchung
 */
export function getCancelUrl(bookingId: string, type: 'booking' | 'workshop' = 'booking'): string {
  const token = generateCancelToken(bookingId);
  const siteUrl = getEnv('SITE_URL', 'https://keramik-auszeit.de');
  return `${siteUrl}/stornierung?id=${encodeURIComponent(bookingId)}&token=${encodeURIComponent(token)}&type=${type}`;
}


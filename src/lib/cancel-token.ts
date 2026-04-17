import crypto from 'crypto';
import { getEnv } from './env';

/**
 * Erzeugt ein Stornierungstoken basierend auf der Buchungs-ID.
 * Nutzt HMAC-SHA256 mit einem serverseitigen Geheimnis.
 * Kein Datenbank-Eintrag nötig - das Token ist deterministisch.
 */
function getSecret(): string {
  // Dediziertes Secret bevorzugt. Fallback auf ADMIN_PASSWORD nur zur
  // Rueckwaertskompatibilitaet bestehender Links — in Prod sollte
  // CANCEL_TOKEN_SECRET gesetzt sein (64 Bytes Random).
  const dedicated = process.env.CANCEL_TOKEN_SECRET;
  if (dedicated && dedicated.length >= 32) {
    return `cancel-token-salt-${dedicated}`;
  }
  const adminPw = process.env.ADMIN_PASSWORD;
  if (adminPw) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('CANCEL_TOKEN_SECRET not set — falling back to ADMIN_PASSWORD (deprecated)');
    }
    return `cancel-token-salt-${adminPw}`;
  }
  throw new Error('Neither CANCEL_TOKEN_SECRET nor ADMIN_PASSWORD configured');
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


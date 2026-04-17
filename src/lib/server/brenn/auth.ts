/**
 * Auth-Helper für Brenn-Admin-Endpoints
 * Nutzt das bestehende Auth-System des Projekts.
 */

import { validateCredentials } from '../../totp';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../rate-limit';

/**
 * Prüft Basic-Auth-Credentials gegen das bestehende System.
 */
export function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic' || !credentials) return false;

  try {
    const decoded = Buffer.from(credentials, 'base64').toString();
    const [username, password] = decoded.split(':');
    const validation = validateCredentials(username, password);
    return validation.valid;
  } catch {
    return false;
  }
}

/**
 * Prueft Rate-Limit und erzwingt Basic-Auth fuer Brenn-Admin-Endpoints.
 * Rueckgabe !== null => Anfrage abweisen.
 */
export function requireAuth(request: Request): Response | null {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.ADMIN);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Basic realm="Brenn-Verwaltung"',
      },
    });
  }
  return null;
}

/**
 * JSON-Erfolgsantwort
 */
export function jsonSuccess(data: any, status: number = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * JSON-Fehlerantwort
 */
export function jsonError(error: string, status: number = 400): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

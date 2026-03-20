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
 * Prüft Auth + Rate-Limiting. Gibt null zurück wenn OK, sonst eine Response.
 */
export function requireAuth(request: Request): Response | null {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.ADMIN);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Nicht autorisiert.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
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

/**
 * CSRF Protection Module
 * Uses double-submit cookie pattern
 */

import { randomBytes } from 'crypto';

// Token storage with expiration (in-memory, for server-side validation)
const tokenStore = new Map<string, { createdAt: number; sessionId: string }>();

// Token validity: 1 hour
const TOKEN_VALIDITY_MS = 60 * 60 * 1000;

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.createdAt > TOKEN_VALIDITY_MS) {
      tokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  tokenStore.set(token, {
    createdAt: Date.now(),
    sessionId,
  });
  return token;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(
  token: string | null,
  sessionId: string
): boolean {
  if (!token) return false;

  const data = tokenStore.get(token);
  if (!data) return false;

  // Check expiration
  if (Date.now() - data.createdAt > TOKEN_VALIDITY_MS) {
    tokenStore.delete(token);
    return false;
  }

  // Check session match
  if (data.sessionId !== sessionId) {
    return false;
  }

  // Token is valid - delete it (one-time use for extra security)
  tokenStore.delete(token);
  return true;
}

/**
 * Get CSRF token from request
 */
export function getCsrfTokenFromRequest(request: Request): string | null {
  // Check header first (preferred for AJAX)
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) return headerToken;

  // For form submissions, we'd need to parse the body
  // This is handled in the middleware or route handler
  return null;
}

/**
 * Create CSRF cookie header
 */
export function csrfCookieHeader(token: string, secure: boolean = true): string {
  const sameSite = secure ? 'Strict' : 'Lax';
  const secureFlag = secure ? '; Secure' : '';
  return `csrf_token=${token}; Path=/; HttpOnly=false; SameSite=${sameSite}${secureFlag}; Max-Age=3600`;
}

/**
 * Extract session ID from request (from cookie or header)
 */
export function getSessionIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  return cookies['session_id'] || null;
}

/**
 * Simple cookie parser
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  });
  return cookies;
}

/**
 * Check if request needs CSRF validation
 * Safe methods (GET, HEAD, OPTIONS) don't need CSRF
 */
export function needsCsrfValidation(request: Request): boolean {
  const method = request.method.toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

/**
 * CSRF error response
 */
export function csrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'CSRF validation failed' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}


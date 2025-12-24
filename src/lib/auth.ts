/**
 * Centralized Authentication Module
 * Combines session management, rate limiting, and audit logging
 */

import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from './rate-limit';
import { createSession, getSession, destroySession, sessionCookieHeader, getSessionIdFromCookie, validateSessionBinding, logoutCookieHeader } from './session';
import { generateCsrfToken, csrfCookieHeader } from './csrf';
import { logAuditEvent } from './audit-log';

/**
 * Get admin password from environment
 */
function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || '';
}

/**
 * Validate Basic Auth credentials
 */
export function validateBasicAuth(request: Request): { valid: boolean; username?: string } {
  const authHeader = request.headers.get('Authorization');
  const adminPassword = getAdminPassword();

  if (!authHeader) return { valid: false };

  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic' || !credentials) return { valid: false };

  try {
    const decoded = Buffer.from(credentials, 'base64').toString();
    const [username, password] = decoded.split(':');

    if (username === 'admin' && password === adminPassword) {
      return { valid: true, username };
    }
  } catch {
    // Invalid base64
  }

  return { valid: false };
}

/**
 * Check authentication with rate limiting and audit logging
 */
export async function checkAuthWithSecurity(
  request: Request
): Promise<{ 
  authenticated: boolean; 
  response?: Response;
  username?: string;
}> {
  const clientId = getClientIdentifier(request);
  
  // Check rate limit for login attempts
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.LOGIN);
  if (!rateLimit.allowed) {
    await logAuditEvent('RATE_LIMIT_EXCEEDED', request, {
      resource: request.url,
      action: 'Login rate limit exceeded',
      success: false,
    });
    return { authenticated: false, response: rateLimitResponse(rateLimit) };
  }

  // Validate credentials
  const auth = validateBasicAuth(request);

  if (!auth.valid) {
    await logAuditEvent('LOGIN_FAILURE', request, {
      resource: request.url,
      action: 'Failed login attempt',
      success: false,
    });
    return { authenticated: false };
  }

  await logAuditEvent('LOGIN_SUCCESS', request, {
    username: auth.username,
    resource: request.url,
    action: 'Successful login',
    success: true,
  });

  return { authenticated: true, username: auth.username };
}

/**
 * Check session-based authentication
 */
export async function checkSessionAuth(
  request: Request
): Promise<{
  authenticated: boolean;
  session?: ReturnType<typeof getSession>;
  response?: Response;
}> {
  const cookieHeader = request.headers.get('Cookie');
  const sessionId = getSessionIdFromCookie(cookieHeader);

  if (!sessionId) {
    return { authenticated: false };
  }

  const session = getSession(sessionId);
  if (!session) {
    await logAuditEvent('SESSION_EXPIRED', request, {
      resource: request.url,
      action: 'Session expired or invalid',
      success: false,
    });
    return { authenticated: false };
  }

  // Validate session binding
  const ipAddress = getClientIdentifier(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  if (!validateSessionBinding(session, ipAddress, userAgent)) {
    await logAuditEvent('SUSPICIOUS_ACTIVITY', request, {
      resource: request.url,
      action: 'Session binding mismatch - possible session hijacking',
      success: false,
      extra: { sessionUser: session.username },
    });
    destroySession(sessionId);
    return { authenticated: false };
  }

  return { authenticated: true, session };
}

/**
 * Create a new session and return cookie headers
 */
export function createAuthSession(
  username: string,
  ipAddress: string,
  userAgent: string,
  isSecure: boolean = true
): { sessionId: string; csrfToken: string; cookieHeaders: string[] } {
  const sessionId = createSession(username, ipAddress, userAgent);
  const csrfToken = generateCsrfToken(sessionId);

  return {
    sessionId,
    csrfToken,
    cookieHeaders: [
      sessionCookieHeader(sessionId, isSecure),
      csrfCookieHeader(csrfToken, isSecure),
    ],
  };
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Log admin action for audit
 */
export async function logAdminAction(
  request: Request,
  action: string,
  resource: string,
  success: boolean,
  username?: string,
  extra?: Record<string, any>
): Promise<void> {
  await logAuditEvent('ADMIN_ACTION', request, {
    username,
    resource,
    action,
    success,
    extra,
  });
}


/**
 * Centralized Authentication Module
 * Combines session management, rate limiting, and audit logging
 */

import { randomBytes, createHash } from 'crypto';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from './rate-limit';
import { createSession, getSession, destroySession, sessionCookieHeader, getSessionIdFromCookie, validateSessionBinding, logoutCookieHeader } from './session';
import { generateCsrfToken, csrfCookieHeader } from './csrf';
import { logAuditEvent } from './audit-log';

// ========== DEVICE TRUST (Remember 2FA) ==========

interface TrustedDevice {
  token: string;
  username: string;
  fingerprint: string; // hash of IP + UserAgent
  createdAt: number;
}

const trustedDevices = new Map<string, TrustedDevice>();
const DEVICE_TRUST_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEVICE_TRUST_COOKIE_NAME = 'device_trust';

// Clean up expired trust tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, device] of trustedDevices.entries()) {
    if (now - device.createdAt > DEVICE_TRUST_VALIDITY_MS) {
      trustedDevices.delete(token);
    }
  }
}, 60 * 60 * 1000);

function deviceFingerprint(ipAddress: string, userAgent: string): string {
  return createHash('sha256').update(`${ipAddress}|${userAgent}`).digest('hex');
}

/**
 * Create a device trust token after successful 2FA
 */
export function createDeviceTrust(username: string, ipAddress: string, userAgent: string): string {
  const token = randomBytes(32).toString('hex');
  const fingerprint = deviceFingerprint(ipAddress, userAgent);

  trustedDevices.set(token, {
    token,
    username,
    fingerprint,
    createdAt: Date.now(),
  });

  return token;
}

/**
 * Check if a device is trusted (skip 2FA)
 */
export function isDeviceTrusted(request: Request): boolean {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return false;

  const match = cookieHeader.match(new RegExp(`${DEVICE_TRUST_COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const token = match[1];
  const device = trustedDevices.get(token);
  if (!device) return false;

  // Check expiry
  if (Date.now() - device.createdAt > DEVICE_TRUST_VALIDITY_MS) {
    trustedDevices.delete(token);
    return false;
  }

  // Validate fingerprint
  const ipAddress = getClientIdentifier(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const fp = deviceFingerprint(ipAddress, userAgent);

  if (device.fingerprint !== fp) {
    return false;
  }

  return true;
}

/**
 * Get trusted device username from cookie
 */
export function getTrustedDeviceUsername(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(new RegExp(`${DEVICE_TRUST_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  const device = trustedDevices.get(match[1]);
  return device ? device.username : null;
}

/**
 * Create device trust cookie header
 */
export function deviceTrustCookieHeader(token: string, isSecure: boolean = true): string {
  const maxAge = Math.floor(DEVICE_TRUST_VALIDITY_MS / 1000);
  const secureFlag = isSecure ? '; Secure' : '';
  const sameSite = isSecure ? 'Strict' : 'Lax';
  return `${DEVICE_TRUST_COOKIE_NAME}=${token}; Path=/; HttpOnly${secureFlag}; SameSite=${sameSite}; Max-Age=${maxAge}`;
}

/**
 * Remove device trust cookie header
 */
export function clearDeviceTrustCookieHeader(): string {
  return `${DEVICE_TRUST_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

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


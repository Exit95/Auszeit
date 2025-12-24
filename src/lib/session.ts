/**
 * Session Management Module
 * Secure session handling for admin area
 */

import { randomBytes, createHash } from 'crypto';

interface Session {
  id: string;
  username: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
}

// In-memory session storage
const sessions = new Map<string, Session>();

// Session configuration
const SESSION_VALIDITY_MS = 60 * 60 * 1000; // 1 hour
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity

// Clean up expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    const isExpired = now - session.createdAt > SESSION_VALIDITY_MS;
    const isIdle = now - session.lastActivity > SESSION_IDLE_TIMEOUT_MS;
    if (isExpired || isIdle) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create a new session
 */
export function createSession(
  username: string,
  ipAddress: string,
  userAgent: string
): string {
  const sessionId = randomBytes(32).toString('hex');
  const now = Date.now();

  sessions.set(sessionId, {
    id: sessionId,
    username,
    createdAt: now,
    lastActivity: now,
    ipAddress,
    userAgent,
  });

  return sessionId;
}

/**
 * Validate and get session
 */
export function getSession(sessionId: string): Session | null {
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  if (!session) return null;

  const now = Date.now();

  // Check if session is expired
  if (now - session.createdAt > SESSION_VALIDITY_MS) {
    sessions.delete(sessionId);
    return null;
  }

  // Check idle timeout
  if (now - session.lastActivity > SESSION_IDLE_TIMEOUT_MS) {
    sessions.delete(sessionId);
    return null;
  }

  // Update last activity
  session.lastActivity = now;

  return session;
}

/**
 * Destroy a session
 */
export function destroySession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Destroy all sessions for a user
 */
export function destroyAllUserSessions(username: string): number {
  let count = 0;
  for (const [id, session] of sessions.entries()) {
    if (session.username === username) {
      sessions.delete(id);
      count++;
    }
  }
  return count;
}

/**
 * Validate session binding (IP and User-Agent)
 */
export function validateSessionBinding(
  session: Session,
  ipAddress: string,
  userAgent: string
): boolean {
  // Strict: require exact IP match
  // Note: Can be relaxed for mobile users with changing IPs
  if (session.ipAddress !== ipAddress) {
    return false;
  }

  // User-Agent should match (basic fingerprinting)
  if (session.userAgent !== userAgent) {
    return false;
  }

  return true;
}

/**
 * Create session cookie header
 */
export function sessionCookieHeader(
  sessionId: string,
  secure: boolean = true
): string {
  const maxAge = Math.floor(SESSION_VALIDITY_MS / 1000);
  const sameSite = secure ? 'Strict' : 'Lax';
  const secureFlag = secure ? '; Secure' : '';
  return `session_id=${sessionId}; Path=/; HttpOnly${secureFlag}; SameSite=${sameSite}; Max-Age=${maxAge}`;
}

/**
 * Create logout cookie header (expires immediately)
 */
export function logoutCookieHeader(): string {
  return 'session_id=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
}

/**
 * Get session ID from cookie header
 */
export function getSessionIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/session_id=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Hash a password (simple - in production use bcrypt or argon2)
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}


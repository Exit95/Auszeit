/**
 * TOTP (Time-based One-Time Password) Module for 2FA
 * Uses Google Authenticator compatible TOTP
 *
 * Supports two user levels:
 * - Superuser: Full access WITHOUT 2FA (for developer)
 * - Admin: Access WITH 2FA (for customer)
 */

import { OTP, generateSecret as otplibGenerateSecret, generateURI } from 'otplib';
import * as crypto from 'node:crypto';

// Create OTP instance with TOTP strategy
const otp = new OTP({ strategy: 'totp' });

/**
 * Get the TOTP secret from environment
 * This should be set once and kept secret
 */
export function getTotpSecret(): string {
  const secret = process.env.TOTP_SECRET;
  if (!secret) {
    console.warn('TOTP_SECRET not configured - 2FA disabled for admin');
    return '';
  }
  return secret;
}

/**
 * Check if 2FA is enabled for admin
 */
export function is2FAEnabled(): boolean {
  return !!getTotpSecret();
}

/**
 * Check if user is superuser (developer access without 2FA)
 */
export function isSuperuser(username: string, password: string): boolean {
  const superuserPassword = process.env.SUPERUSER_PASSWORD;
  if (!superuserPassword) return false;
  return username === 'superuser' && password === superuserPassword;
}

/**
 * Check if user is admin (customer access with 2FA)
 */
export function isAdmin(username: string, password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  return username === 'admin' && password === adminPassword;
}

/**
 * Validate credentials and return user type
 */
export function validateCredentials(username: string, password: string): {
  valid: boolean;
  userType: 'superuser' | 'admin' | null;
  requires2FA: boolean;
} {
  if (isSuperuser(username, password)) {
    // Superuser benötigt auch 2FA wenn aktiviert
    return { valid: true, userType: 'superuser', requires2FA: is2FAEnabled() };
  }
  if (isAdmin(username, password)) {
    return { valid: true, userType: 'admin', requires2FA: is2FAEnabled() };
  }
  return { valid: false, userType: null, requires2FA: false };
}

/**
 * Generate a new TOTP secret (for initial setup)
 */
export function generateSecret(): string {
  return otplibGenerateSecret();
}

/**
 * Generate the otpauth URL for QR code
 */
export function generateOtpAuthUrl(secret: string, accountName: string = 'Admin'): string {
  const issuer = 'Atelier Auszeit';
  return generateURI({
    issuer,
    label: accountName,
    secret,
    algorithm: 'sha1',
    digits: 6,
    period: 30,
  });
}

/**
 * Verify a TOTP token
 */
export function verifyToken(token: string): boolean {
  const secret = getTotpSecret();
  if (!secret) {
    // If no secret configured, 2FA is disabled - allow access
    return true;
  }

  try {
    // Use synchronous verification with tolerance for clock drift
    return otp.verifySync({
      token,
      secret,
      epochTolerance: 1, // Allow 1 step before/after
    });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate current token (for testing purposes only)
 */
export function generateCurrentToken(): string {
  const secret = getTotpSecret();
  if (!secret) return '';
  return otp.generateSync({ secret });
}

// Pending 2FA sessions (after password verified, waiting for TOTP)
interface Pending2FASession {
  username: string;
  userType: 'superuser' | 'admin';
  credentials: string; // Base64 encoded credentials
  createdAt: number;
  ipAddress: string;
  userAgent: string;
}

const pending2FASessions = new Map<string, Pending2FASession>();

// Clean up expired pending sessions (5 minutes validity)
const PENDING_SESSION_VALIDITY_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of pending2FASessions.entries()) {
    if (now - session.createdAt > PENDING_SESSION_VALIDITY_MS) {
      pending2FASessions.delete(id);
    }
  }
}, 60 * 1000);

/**
 * Create a pending 2FA session after password verification
 */
export function createPending2FASession(
  username: string,
  userType: 'superuser' | 'admin',
  credentials: string,
  ipAddress: string,
  userAgent: string
): string {
  const sessionId = crypto.randomBytes(32).toString('hex');

  pending2FASessions.set(sessionId, {
    username,
    userType,
    credentials,
    createdAt: Date.now(),
    ipAddress,
    userAgent,
  });

  return sessionId;
}

/**
 * Get and validate pending 2FA session
 */
export function getPending2FASession(sessionId: string): Pending2FASession | null {
  if (!sessionId) return null;
  
  const session = pending2FASessions.get(sessionId);
  if (!session) return null;
  
  // Check expiration
  if (Date.now() - session.createdAt > PENDING_SESSION_VALIDITY_MS) {
    pending2FASessions.delete(sessionId);
    return null;
  }
  
  return session;
}

/**
 * Complete 2FA verification and remove pending session
 */
export function completePending2FASession(sessionId: string): Pending2FASession | null {
  const session = getPending2FASession(sessionId);
  if (session) {
    pending2FASessions.delete(sessionId);
  }
  return session;
}


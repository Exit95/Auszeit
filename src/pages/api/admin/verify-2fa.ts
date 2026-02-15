import type { APIRoute } from 'astro';
import {
  is2FAEnabled,
  verifyToken,
  createPending2FASession,
  completePending2FASession,
  getPending2FASession,
  validateCredentials
} from '../../../lib/totp';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';
import { logAuditEvent } from '../../../lib/audit-log';

/**
 * Authentication flow:
 * - Superuser: Direct login without 2FA
 * - Admin: Requires 2FA after password verification
 *
 * Step 1: Verify password and create pending 2FA session (for admin)
 * POST /api/admin/verify-2fa with { action: 'init', credentials: base64 }
 *
 * Step 2: Verify TOTP code (for admin)
 * POST /api/admin/verify-2fa with { action: 'verify', sessionId: string, code: string }
 */
export const POST: APIRoute = async ({ request }) => {
  const clientId = getClientIdentifier(request);

  // Rate limiting for 2FA attempts
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.LOGIN);
  if (!rateLimit.allowed) {
    await logAuditEvent('RATE_LIMIT_EXCEEDED', request, {
      resource: '/api/admin/verify-2fa',
      action: '2FA rate limit exceeded',
      success: false,
    });
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'check') {
      // Check if 2FA is enabled
      return new Response(JSON.stringify({
        enabled: is2FAEnabled()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'init') {
      // Step 1: Verify password first
      const { credentials } = body;

      if (!credentials) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Credentials required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Decode and validate credentials
      const decoded = Buffer.from(credentials, 'base64').toString();
      const [username, password] = decoded.split(':');

      const validation = validateCredentials(username, password);

      if (!validation.valid) {
        await logAuditEvent('LOGIN_FAILURE', request, {
          resource: '/api/admin/verify-2fa',
          action: 'Invalid credentials',
          success: false,
        });
        return new Response(JSON.stringify({
          success: false,
          message: 'Ungültige Anmeldedaten'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if 2FA is required (now applies to both superuser and admin)
      if (!validation.requires2FA) {
        // 2FA not enabled, login successful
        await logAuditEvent('LOGIN_SUCCESS', request, {
          username: validation.userType || 'unknown',
          resource: '/api/admin/verify-2fa',
          action: `${validation.userType} login without 2FA (not configured)`,
          success: true,
        });
        return new Response(JSON.stringify({
          success: true,
          requires2FA: false,
          userType: validation.userType,
          credentials
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create pending 2FA session for both superuser and admin
      const ipAddress = clientId;
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const sessionId = createPending2FASession(username, validation.userType!, credentials, ipAddress, userAgent);

      await logAuditEvent('2FA_INITIATED', request, {
        username: validation.userType || 'unknown',
        resource: '/api/admin/verify-2fa',
        action: 'Password verified, 2FA code required',
        success: true,
      });

      return new Response(JSON.stringify({
        success: true,
        requires2FA: true,
        userType: validation.userType,
        sessionId
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      // Step 2: Verify TOTP code
      const { sessionId, code } = body;

      if (!sessionId || !code) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Session ID and code required' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get pending session
      const pendingSession = getPending2FASession(sessionId);
      if (!pendingSession) {
        await logAuditEvent('2FA_FAILURE', request, {
          resource: '/api/admin/verify-2fa',
          action: '2FA session expired or invalid',
          success: false,
        });
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Sitzung abgelaufen. Bitte erneut anmelden.' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Verify TOTP code
      if (!verifyToken(code)) {
        await logAuditEvent('2FA_FAILURE', request, {
          username: pendingSession.userType,
          resource: '/api/admin/verify-2fa',
          action: 'Invalid 2FA code',
          success: false,
        });
        return new Response(JSON.stringify({
          success: false,
          message: 'Ungültiger Code. Bitte erneut versuchen.'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 2FA successful - complete session
      const session = completePending2FASession(sessionId);

      await logAuditEvent('LOGIN_SUCCESS', request, {
        username: session?.userType || 'unknown',
        resource: '/api/admin/verify-2fa',
        action: '2FA verification successful',
        success: true,
      });

      return new Response(JSON.stringify({
        success: true,
        credentials: session?.credentials,
        userType: session?.userType
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Invalid action' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('2FA error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};


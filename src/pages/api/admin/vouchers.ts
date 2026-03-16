import type { APIRoute } from 'astro';
import { getVouchers, getVoucherByCode, redeemVoucher, updateVoucherStatus, createVoucher, type VoucherStatus } from '../../../lib/voucher-storage';
import { validateCredentials } from '../../../lib/totp';
import { checkSessionAuth, logAdminAction } from '../../../lib/auth';
import { validateCsrfToken, getCsrfTokenFromRequest } from '../../../lib/csrf';
import { getSessionIdFromCookie } from '../../../lib/session';
import { sanitizeText } from '../../../lib/sanitize';

/**
 * Admin-Auth: Prüft Session+CSRF (bevorzugt) oder Basic Auth (Fallback).
 * Wenn ENFORCE_ADMIN_MFA=true, wird Basic Auth in Produktion abgelehnt.
 */
async function requireAdmin(request: Request): Promise<{ authorized: boolean; username?: string }> {
  // 1. Session-Auth prüfen
  const sessionAuth = await checkSessionAuth(request);
  if (sessionAuth.authenticated && sessionAuth.session) {
    // CSRF-Check für nicht-GET-Anfragen
    if (request.method !== 'GET') {
      const csrfToken = getCsrfTokenFromRequest(request);
      const cookieHeader = request.headers.get('Cookie');
      const sessionId = getSessionIdFromCookie(cookieHeader);
      if (!sessionId || !validateCsrfToken(csrfToken, sessionId)) {
        return { authorized: false };
      }
    }
    return { authorized: true, username: sessionAuth.session.username };
  }

  // 2. Basic-Auth-Fallback (wenn MFA nicht erzwungen wird)
  if (process.env.ENFORCE_ADMIN_MFA === 'true') {
    return { authorized: false };
  }
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return { authorized: false };
  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic' || !credentials) return { authorized: false };
  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');
  const validation = validateCredentials(username, password);
  return { authorized: validation.valid, username };
}

const VALID_STATUSES: VoucherStatus[] = ['active', 'redeemed', 'expired'];
const VOUCHER_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

// GET - Alle Gutscheine abrufen
export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const vouchers = await getVouchers();
    // Neueste zuerst
    vouchers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    await logAdminAction(request, 'voucher-list', '/api/admin/vouchers', true, auth.username);
    return new Response(JSON.stringify(vouchers), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Admin Vouchers] GET error:', error);
    return new Response(JSON.stringify({ error: 'Fehler beim Laden der Gutscheine' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST - Gutschein einlösen oder Status ändern
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const body = await request.json();
    const { action, note, status } = body;
    let { code } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code fehlt' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Input-Validation: Code sanitizen
    code = sanitizeText(code).toUpperCase();

    if (action === 'redeem') {
      const sanitizedNote = note ? sanitizeText(note) : undefined;
      const voucher = await redeemVoucher(code, auth.username || 'admin', sanitizedNote);
      if (!voucher) {
        // Prüfe ob Gutschein existiert aber schon eingelöst
        const existing = await getVoucherByCode(code);
        if (existing && existing.status === 'redeemed') {
          await logAdminAction(request, 'voucher-redeem-duplicate', '/api/admin/vouchers', false, auth.username, { code });
          return new Response(JSON.stringify({ error: 'Gutschein bereits eingelöst', voucher: existing }), {
            status: 409, headers: { 'Content-Type': 'application/json' },
          });
        }
        await logAdminAction(request, 'voucher-redeem-not-found', '/api/admin/vouchers', false, auth.username, { code });
        return new Response(JSON.stringify({ error: 'Gutschein nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      await logAdminAction(request, 'voucher-redeem', '/api/admin/vouchers', true, auth.username, { code, amount: voucher.amount });
      return new Response(JSON.stringify({ success: true, voucher }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update-status' && status) {
      // Input-Validation: Status muss gültig sein
      if (!VALID_STATUSES.includes(status as VoucherStatus)) {
        return new Response(JSON.stringify({ error: 'Ungültiger Status. Erlaubt: active, redeemed, expired' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }
      const voucher = await updateVoucherStatus(code, status as VoucherStatus);
      if (!voucher) {
        return new Response(JSON.stringify({ error: 'Gutschein nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      await logAdminAction(request, 'voucher-update-status', '/api/admin/vouchers', true, auth.username, { code, newStatus: status });
      return new Response(JSON.stringify({ success: true, voucher }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Gutschein-Info per Code abrufen (für Scanner)
    if (action === 'lookup') {
      const voucher = await getVoucherByCode(code);
      if (!voucher) {
        return new Response(JSON.stringify({ error: 'Gutschein nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      await logAdminAction(request, 'voucher-lookup', '/api/admin/vouchers', true, auth.username, { code });
      return new Response(JSON.stringify({ voucher }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ungültige Aktion' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Admin Vouchers] POST error:', error);
    return new Response(JSON.stringify({ error: 'Fehler bei der Verarbeitung' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};


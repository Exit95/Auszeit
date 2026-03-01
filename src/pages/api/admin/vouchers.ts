import type { APIRoute } from 'astro';
import { getVouchers, getVoucherByCode, redeemVoucher, updateVoucherStatus, createVoucher } from '../../../lib/voucher-storage';
import { validateCredentials } from '../../../lib/totp';

function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') return false;
  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');
  return validateCredentials(username, password).valid;
}

// GET - Alle Gutscheine abrufen
export const GET: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const vouchers = await getVouchers();
    // Neueste zuerst
    vouchers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const body = await request.json();
    const { action, code, note, status } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code fehlt' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'redeem') {
      const voucher = await redeemVoucher(code, 'admin', note);
      if (!voucher) {
        // Prüfe ob Gutschein existiert aber schon eingelöst
        const existing = await getVoucherByCode(code);
        if (existing && existing.status === 'redeemed') {
          return new Response(JSON.stringify({ error: 'Gutschein bereits eingelöst', voucher: existing }), {
            status: 409, headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ error: 'Gutschein nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, voucher }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update-status' && status) {
      const voucher = await updateVoucherStatus(code, status);
      if (!voucher) {
        return new Response(JSON.stringify({ error: 'Gutschein nicht gefunden' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }
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


import type { APIRoute } from 'astro';
import { getInquiries, updateInquiry } from '../../../../lib/storage';
import { FROM_EMAIL, isSmtpConfigured } from '../../../../lib/env';
import { createSmtpTransporter } from '../../../../lib/smtp';
import { inquiryReplyHtml } from '../../../../lib/email-templates';
import { sanitizeText } from '../../../../lib/sanitize';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../../lib/rate-limit';
import { logAuditEvent } from '../../../../lib/audit-log';
import { validateCredentials } from '../../../../lib/totp';
import type { InquiryEventType } from '../../../../lib/storage';

const EVENT_TYPE_LABELS: Record<InquiryEventType, string> = {
  kindergeburtstag: 'Kindergeburtstag',
  jga: 'JGA (Junggesellenabschied)',
  stammtisch: 'Stammtisch / Gruppenabend',
  firmen_event: 'Firmen-Event / Teambuilding',
  privater_anlass: 'Privater Anlass',
  sonstiges: 'Sonstiges',
};

function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') return false;
  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');
  const validation = validateCredentials(username, password);
  return validation.valid;
}

// POST - Antwort auf eine Anfrage senden (aus Admin-App)
// Body: { id, subject?, message, setStatus? }
// - Versendet Mail an den Kunden via SMTP
// - Setzt Status automatisch auf "contacted" (oder setStatus, falls angegeben)
// - Hängt die gesendete Nachricht an adminNotes an (Protokoll)
export const POST: APIRoute = async ({ request }) => {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.ADMIN);
  if (!rateLimit.allowed) {
    await logAuditEvent('RATE_LIMIT_EXCEEDED', request, {
      resource: '/api/admin/inquiries/reply',
      action: 'Admin rate limit exceeded',
      success: false,
    });
    return rateLimitResponse(rateLimit);
  }

  if (!checkAuth(request)) {
    await logAuditEvent('UNAUTHORIZED_ACCESS', request, {
      resource: '/api/admin/inquiries/reply',
      action: 'Unauthorized admin access attempt',
      success: false,
    });
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const rawMessage = typeof body.message === 'string' ? body.message : '';
    const rawSubject = typeof body.subject === 'string' ? body.subject : '';
    const setStatus = typeof body.setStatus === 'string' ? body.setStatus : 'contacted';

    if (!id || !rawMessage.trim()) {
      return new Response(JSON.stringify({ error: 'ID und Nachricht sind erforderlich' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = sanitizeText(rawMessage) || rawMessage.trim();
    const subject = rawSubject.trim() || 'Antwort auf deine Anfrage · Atelier Auszeit';

    const all = await getInquiries();
    const inquiry = all.find((i) => i.id === id);
    if (!inquiry) {
      return new Response(JSON.stringify({ error: 'Anfrage nicht gefunden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!isSmtpConfigured()) {
      return new Response(JSON.stringify({ error: 'SMTP ist nicht konfiguriert' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const eventLabel = EVENT_TYPE_LABELS[inquiry.eventType] || String(inquiry.eventType);

    const html = inquiryReplyHtml({
      name: inquiry.name,
      eventLabel,
      message,
      preferredDate: inquiry.preferredDate,
      participants: inquiry.participants,
    });

    const transporter = createSmtpTransporter();
    await transporter.sendMail({
      from: `"Atelier Auszeit - Irena Woschkowiak" <${FROM_EMAIL}>`,
      to: inquiry.email,
      replyTo: FROM_EMAIL,
      subject,
      text: `${message}\n\nHerzliche Grüße\nIrena\nAtelier Auszeit`,
      html,
    });

    // Status + Notizen aktualisieren
    const timestamp = new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    const newNote = `[${timestamp}] Antwort gesendet:\n${message}`;
    const combinedNotes = inquiry.adminNotes
      ? `${inquiry.adminNotes}\n\n${newNote}`
      : newNote;

    const validStatus = ['new', 'contacted', 'confirmed', 'cancelled'].includes(setStatus)
      ? setStatus
      : 'contacted';

    await updateInquiry(id, { status: validStatus, adminNotes: combinedNotes });

    await logAuditEvent('ADMIN_ACTION', request, {
      username: 'admin',
      resource: '/api/admin/inquiries/reply',
      action: `Reply sent to inquiry ${id}`,
      success: true,
      extra: { inquiryId: id, to: inquiry.email, status: validStatus },
    });

    return new Response(JSON.stringify({ success: true, status: validStatus }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Inquiry reply error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Fehler beim Senden' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

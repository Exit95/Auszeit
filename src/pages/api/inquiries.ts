import type { APIRoute } from 'astro';
import { addInquiry, getInquiries, updateInquiry } from '../../lib/storage';
import { BOOKING_EMAIL, FROM_EMAIL, isSmtpConfigured } from '../../lib/env';
import { createSmtpTransporter } from '../../lib/smtp';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNumber, sanitizeDate } from '../../lib/sanitize';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../lib/rate-limit';
import type { InquiryEventType } from '../../lib/storage';
import { validateCredentials } from '../../lib/totp';

const VALID_EVENT_TYPES: InquiryEventType[] = ['kindergeburtstag', 'jga', 'stammtisch', 'firmen_event', 'privater_anlass', 'sonstiges'];

function checkAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') return false;
  const decoded = atob(credentials);
  const [username, password] = decoded.split(':');
  const validation = validateCredentials(username, password);
  return validation.valid;
}

const EVENT_TYPE_LABELS: Record<InquiryEventType, string> = {
  kindergeburtstag: 'Kindergeburtstag',
  jga: 'JGA (Junggesellenabschied)',
  stammtisch: 'Stammtisch / Gruppenabend',
  firmen_event: 'Firmen-Event / Teambuilding',
  privater_anlass: 'Privater Anlass',
  sonstiges: 'Sonstiges',
};

// POST - Neue Anfrage erstellen (Frontend)
export const POST: APIRoute = async ({ request }) => {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.BOOKING);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const data = await request.json();
    const name = sanitizeText(data.name);
    const email = sanitizeEmail(data.email);
    const phone = sanitizePhone(data.phone);
    const participants = sanitizeNumber(data.participants, 1, 50);
    const preferredDate = sanitizeDate(data.preferredDate);
    const message = sanitizeText(data.message);
    const eventType = VALID_EVENT_TYPES.includes(data.eventType) ? data.eventType as InquiryEventType : 'sonstiges';

    if (!name || !email || !phone) {
      return new Response(JSON.stringify({ success: false, message: 'Bitte Name, E-Mail und Telefonnummer angeben.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const inquiry = await addInquiry({
      eventType,
      name,
      email,
      phone: phone || undefined,
      preferredDate: preferredDate || undefined,
      participants,
      message: message || undefined,
    });

    // Admin-E-Mail im Hintergrund senden
    if (isSmtpConfigured()) {
      const sendNotification = async () => {
        try {
          const transporter = createSmtpTransporter();
          const label = EVENT_TYPE_LABELS[eventType] || eventType;
          await transporter.sendMail({
            from: `"Atelier Auszeit" <${FROM_EMAIL}>`,
            to: BOOKING_EMAIL,
            subject: `Neue Anfrage: ${label} von ${name}`,
            text: `Neue Anfrage über die Webseite:\n\nArt: ${label}\nName: ${name}\nE-Mail: ${email}\nTelefon: ${phone || 'Nicht angegeben'}\nWunschdatum: ${preferredDate || 'Nicht angegeben'}\nPersonen: ${participants}\n\nNachricht:\n${message || 'Keine Nachricht'}\n\nBitte im Admin-Panel unter "Anfragen" bearbeiten.`,
          });
          // Bestätigungs-E-Mail an Kunden
          await transporter.sendMail({
            from: `"Atelier Auszeit - Irena Woschkowiak" <${FROM_EMAIL}>`,
            to: email,
            subject: `Ihre Anfrage bei Atelier Auszeit: ${label}`,
            text: `Liebe/r ${name},\n\nvielen Dank für Ihre Anfrage!\n\nArt: ${label}\nWunschdatum: ${preferredDate || 'Flexibel'}\nPersonen: ${participants}\n\nWir melden uns zeitnah bei Ihnen, um die Details zu besprechen.\n\nHerzliche Grüße,\nIrena Woschkowiak\nAtelier Auszeit\nFeldstiege 6a\n48599 Gronau\n\nTelefon: +49 176 34255005\nE-Mail: keramik-auszeit@web.de`,
          });
        } catch (err) {
          console.error('Inquiry email error:', err);
        }
      };
      sendNotification().catch(err => console.error('Background inquiry email error:', err));
    }

    return new Response(JSON.stringify({ success: true, message: 'Ihre Anfrage wurde erfolgreich gesendet!', inquiry }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Inquiry error:', err);
    return new Response(JSON.stringify({ success: false, message: 'Fehler beim Senden der Anfrage.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

// GET - Alle Anfragen laden (Admin)
export const GET: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const inquiries = await getInquiries();
    return new Response(JSON.stringify(inquiries), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Get inquiries error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

// PUT - Anfrage aktualisieren (Admin)
export const PUT: APIRoute = async ({ request }) => {
  if (!checkAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const data = await request.json();
    const { id, status, adminNotes } = data;
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await updateInquiry(id, { status, adminNotes });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Update inquiry error:', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


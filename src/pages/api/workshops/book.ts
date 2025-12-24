import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { isS3Configured, readJsonFromS3, writeJsonToS3 } from '../../../lib/s3-storage';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, BOOKING_EMAIL, FROM_EMAIL, isSmtpConfigured } from '../../../lib/env';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNumber, sanitizeId } from '../../../lib/sanitize';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';

const DATA_DIR = path.join(process.cwd(), 'data');
const WORKSHOP_BOOKINGS_FILE = path.join(DATA_DIR, 'workshop-bookings.json');
const WORKSHOP_BOOKINGS_FILENAME = 'workshop-bookings.json';

interface WorkshopBooking {
  id: string;
  workshopId: string;
  name: string;
  email: string;
  phone?: string;
  participants: number;
  notes?: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

// Sicherstellen, dass das Data-Verzeichnis existiert (nur für lokalen Fallback)
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Sicherstellen, dass die Datei existiert (nur für lokalen Fallback)
async function ensureFile(filePath: string, defaultData: any) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2));
  }
}

async function getWorkshopBookings(): Promise<WorkshopBooking[]> {
  if (isS3Configured()) {
    return await readJsonFromS3<WorkshopBooking[]>(WORKSHOP_BOOKINGS_FILENAME, []);
  }
  await ensureDataDir();
  await ensureFile(WORKSHOP_BOOKINGS_FILE, []);
  const data = await fs.readFile(WORKSHOP_BOOKINGS_FILE, 'utf-8');
  return JSON.parse(data);
}

async function saveWorkshopBookings(bookings: WorkshopBooking[]): Promise<void> {
  if (isS3Configured()) {
    await writeJsonToS3(WORKSHOP_BOOKINGS_FILENAME, bookings);
    return;
  }
  await ensureDataDir();
  await fs.writeFile(WORKSHOP_BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

// POST - Workshop buchen
export const POST: APIRoute = async ({ request }) => {
  // Rate limiting for booking submissions
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.BOOKING);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();

    // Sanitize all inputs
    const workshopId = sanitizeId(body.workshopId);
    const name = sanitizeText(body.name);
    const email = sanitizeEmail(body.email);
    const phone = sanitizePhone(body.phone);
    const participants = sanitizeNumber(body.participants, 1, 10);
    const notes = sanitizeText(body.notes);

    // Validierung
    if (!workshopId || !name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Workshop laden (aus S3 oder lokal)
    let workshops: any[];
    if (isS3Configured()) {
      workshops = await readJsonFromS3<any[]>('workshops.json', []);
    } else {
      const workshopsFile = path.join(DATA_DIR, 'workshops.json');
      await ensureFile(workshopsFile, []);
      const workshopsData = await fs.readFile(workshopsFile, 'utf-8');
      workshops = JSON.parse(workshopsData);
    }
    
    const workshop = workshops.find((w: any) => w.id === workshopId);
    
    if (!workshop) {
      return new Response(JSON.stringify({ error: 'Workshop not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!workshop.active) {
      return new Response(JSON.stringify({ error: 'Workshop is not active' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prüfe verfügbare Plätze
    const bookings = await getWorkshopBookings();
    const workshopBookings = bookings.filter(
      b => b.workshopId === workshopId && b.status !== 'cancelled'
    );
    
    const currentParticipants = workshopBookings.reduce(
      (sum, b) => sum + b.participants, 
      0
    );
    
    const availableSpots = workshop.maxParticipants - currentParticipants;
    
    if (participants > availableSpots) {
      return new Response(JSON.stringify({ 
        error: 'Not enough spots available',
        availableSpots 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

	    // Erstelle Buchung (inputs are already sanitized)
	    const newBooking: WorkshopBooking = {
	      id: `wb_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
	      workshopId,
	      name,
	      email,
	      phone: phone || undefined,
	      participants,
	      notes: notes || undefined,
	      createdAt: new Date().toISOString(),
	      status: 'pending',
	    };
	
	    bookings.push(newBooking);
	    await saveWorkshopBookings(bookings);

	    // E-Mail-Adressen aus zentraler Config
	    const bookingEmail = BOOKING_EMAIL;
	    const fromEmail = FROM_EMAIL;

	    // E-Mail-Inhalte vorbereiten
	    const adminSubject = `Neue Workshop-Buchung: ${workshop.title} - ${name}`;
	    const customerSubject = `Workshop-Buchungsanfrage eingegangen - ${workshop.title}`;

	    const adminHtml = `
	      <h2>Neue Workshop-Buchung</h2>
	      <p><strong>Workshop:</strong> ${workshop.title}</p>
	      <p><strong>Datum:</strong> ${workshop.date}</p>
	      <p><strong>Uhrzeit:</strong> ${workshop.time} Uhr</p>
	      <p><strong>Preis:</strong> ${workshop.price}</p>
	      <hr />
	      <p><strong>Name:</strong> ${name}</p>
	      <p><strong>E-Mail:</strong> ${email}</p>
	      <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
	      <p><strong>Teilnehmer:</strong> ${participants}</p>
	      <p><strong>Notizen:</strong> ${notes || 'Keine'}</p>
	    `;

	    const adminText = `
	Neue Workshop-Buchung

	Workshop: ${workshop.title}
	Datum: ${workshop.date}
	Uhrzeit: ${workshop.time} Uhr
	Preis: ${workshop.price}

	Name: ${name}
	E-Mail: ${email}
	Telefon: ${phone || 'Nicht angegeben'}
	Teilnehmer: ${participants}
	Notizen: ${notes || 'Keine'}
	    `;

	    const customerHtml = `
	      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
	        <h2 style="color: #8B6F47;">Vielen Dank f&uuml;r Ihre Workshop-Buchungsanfrage!</h2>
	        <p>Liebe/r ${name},</p>
	        <p>wir haben Ihre Buchungsanfrage f&uuml;r den Workshop <strong>${workshop.title}</strong> erhalten.</p>
	        <p>Sie erhalten eine <strong>separate E-Mail mit der endg&uuml;ltigen Best&auml;tigung</strong>, sobald wir Ihren Platz best&auml;tigt haben.</p>

	        <div style="background-color: #F5F0E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
	          <h3 style="color: #8B6F47; margin-top: 0;">Ihre Angaben:</h3>
	          <p><strong>Workshop:</strong> ${workshop.title}</p>
	          <p><strong>Datum:</strong> ${workshop.date}</p>
	          <p><strong>Uhrzeit:</strong> ${workshop.time} Uhr</p>
	          <p><strong>Teilnehmer:</strong> ${participants}</p>
	          ${notes ? `<p><strong>Ihre Notizen:</strong> ${notes}</p>` : ''}
	        </div>

	        <p>Bei Fragen oder &Auml;nderungsw&uuml;nschen k&ouml;nnen Sie uns gerne kontaktieren:</p>
	        <p>
	          📧 E-Mail: ${bookingEmail}<br />
	        </p>

	        <p style="margin-top: 30px;">Herzliche Gr&uuml;&szlig;e,<br />
	        <strong>Irena Woschkowiak</strong><br />
	        Atelier Auszeit</p>
	      </div>
	    `;

	    const customerText = `
	Vielen Dank f&uuml;r Ihre Workshop-Buchungsanfrage!

	Liebe/r ${name},

	wir haben Ihre Buchungsanfrage f&uuml;r den Workshop "${workshop.title}" erhalten.
	Sie erhalten eine separate E-Mail mit der endg&uuml;ltigen Best&auml;tigung, sobald wir Ihren Platz best&auml;tigt haben.

	Ihre Angaben:
	  Workshop: ${workshop.title}
	  Datum: ${workshop.date}
	  Uhrzeit: ${workshop.time} Uhr
	  Teilnehmer: ${participants}
	  ${notes ? `Notizen: ${notes}` : ''}

	Kontakt:
	  E-Mail: ${bookingEmail}

	Herzliche Gr&uuml;&szlig;e,
	Irena Woschkowiak
	Atelier Auszeit
	    `;

	    // E-Mail-Versand nur, wenn SMTP konfiguriert ist
	    if (isSmtpConfigured()) {
	      try {
	        const transporter = nodemailer.createTransport({
	          host: SMTP_HOST,
	          port: parseInt(SMTP_PORT),
	          secure: SMTP_PORT === '465',
	          auth: {
	            user: SMTP_USER,
	            pass: SMTP_PASS,
	          },
	          tls: {
	            rejectUnauthorized: false,
	          },
	        });

	        await transporter.verify();

	        // Admin-Mail
	        await transporter.sendMail({
	          from: `"Atelier Auszeit - Irena Woschkowiak" <${fromEmail}>`,
	          to: bookingEmail,
	          subject: adminSubject,
	          text: adminText,
	          html: adminHtml,
	        });

	        // Kunden-Mail
	        await transporter.sendMail({
	          from: `"Atelier Auszeit - Irena Woschkowiak" <${fromEmail}>`,
	          to: email,
	          subject: customerSubject,
	          text: customerText,
	          html: customerHtml,
	        });
	      } catch (mailError) {
	        console.error('Error sending workshop booking emails:', mailError);
	      }
	    } else {
	      console.warn('⚠️ SMTP nicht konfiguriert - Workshop-Buchungs-E-Mails werden nicht gesendet');
	    }

	    return new Response(JSON.stringify({ 
	      success: true, 
	      booking: newBooking 
	    }), {
	      status: 201,
	      headers: { 'Content-Type': 'application/json' }
	    });
  } catch (error) {
    console.error('Error creating workshop booking:', error);
    return new Response(JSON.stringify({ error: 'Failed to create booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

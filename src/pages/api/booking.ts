import type { APIRoute } from 'astro';
import { getTimeSlots, addBooking } from '../../lib/storage';
import { BOOKING_EMAIL, FROM_EMAIL, isSmtpConfigured } from '../../lib/env';
import { createSmtpTransporter } from '../../lib/smtp';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNumber, sanitizeDate, sanitizeTime } from '../../lib/sanitize';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../lib/rate-limit';
import { createICalEvent } from '../../lib/ical-helper';
import { getCancelUrl } from '../../lib/cancel-token';
import { bookingRequestCustomerHtml, bookingRequestAdminHtml } from '../../lib/email-templates';

export const POST: APIRoute = async ({ request }) => {
	  // Rate limiting
	  const clientId = getClientIdentifier(request);
	  const rateLimit = checkRateLimit(clientId, RATE_LIMITS.BOOKING);
	  if (!rateLimit.allowed) {
	    return rateLimitResponse(rateLimit);
	  }

	  try {
	    const data = await request.json();

	    // Sanitize all inputs
	    const name = sanitizeText(data.name);
	    const email = sanitizeEmail(data.email);
	    const phone = sanitizePhone(data.phone);
	    const participants = sanitizeNumber(data.participants, 1, 20);
	    const date = sanitizeDate(data.date);
	    const time = sanitizeTime(data.time);
	    const notes = sanitizeText(data.notes);

	    // Teilnehmernamen sanitizen
	    let participantNames: string[] = [];
	    if (Array.isArray(data.participantNames)) {
	      participantNames = data.participantNames
	        .map((n: any) => sanitizeText(String(n || '')))
	        .filter((n: string) => n.length > 0)
	        .slice(0, participants);
	    }

	    // Validate required fields
	    if (!name || !email || !phone || !date || !time) {
	      return new Response(
	        JSON.stringify({
	          success: false,
	          message: 'Bitte füllen Sie alle Pflichtfelder korrekt aus (inkl. Telefonnummer)',
	        }),
	        {
	          status: 400,
	          headers: { 'Content-Type': 'application/json' }
	        }
	      );
	    }

		    // Finde den passenden Slot
		    const slots = await getTimeSlots();

		    // Finde alle passenden Slots und nimm den mit verfügbaren Plätzen
		    // (Falls mehrere Slots mit gleichem Datum/Zeit existieren)
		    const matchingSlots = slots.filter(s => s.date === date && s.time === time);

		    // Bevorzuge Slot mit verfügbaren Plätzen, sonst nimm den neuesten
		    const slot = matchingSlots.find(s => s.available > 0) ||
		                 matchingSlots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!slot) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Dieser Termin ist nicht mehr verfügbar',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

	    if (slot.available < participants) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Nur noch ${slot.available} Plätze verfügbar`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

	    // Buchung speichern
	    const booking = await addBooking({
	      slotId: slot.id,
	      name,
	      email: email!,
	      phone: phone || '',
	      participants,
	      participantNames: participantNames.length > 0 ? participantNames : undefined,
	      notes: notes || '',
	    });

    if (!booking) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Buchung konnte nicht gespeichert werden',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

		    // E-Mail-Adressen aus Environment-Variablen
		    const bookingEmail = BOOKING_EMAIL;
		    const fromEmail = FROM_EMAIL;

	    // Anzeigeformat für die Uhrzeit (mit optionaler Endzeit)
	    const timeDisplay = slot.endTime ? `${slot.time} - ${slot.endTime}` : slot.time;

	    // Teilnehmernamen für E-Mail formatieren
	    const participantNamesHtml = participantNames.length > 0
	      ? `<p><strong>Teilnehmer:</strong></p><ol>${participantNames.map(n => `<li>${n}</li>`).join('')}</ol>`
	      : '';
	    const participantNamesText = participantNames.length > 0
	      ? `Teilnehmer:\n${participantNames.map((n, i) => `  ${i + 1}. ${n}`).join('\n')}`
	      : '';

	    // E-Mail-Benachrichtigung für Admin vorbereiten
	    const adminEmailData = {
	      to: bookingEmail,
	      from: fromEmail,
	      subject: `Neue Buchung: ${name} – ${date} ${timeDisplay} Uhr`,
        html: bookingRequestAdminHtml({
          name, email,
          phone: phone || 'Nicht angegeben',
          date, time: timeDisplay,
          participants,
          participantNames: participantNames.length ? participantNames : undefined,
          notes: notes || undefined,
        }),
        text: `Neue Buchungsanfrage\n\nName: ${name}\nE-Mail: ${email}\nTelefon: ${phone || 'Nicht angegeben'}\nDatum: ${date}\nUhrzeit: ${timeDisplay} Uhr\nPersonen: ${participants}\n${participantNamesText}\nNotizen: ${notes || 'Keine'}`,
    };

		    // Stornierungslink für den Kunden
		    const cancelUrl = getCancelUrl(booking.id, 'booking');

		    // Eingangsbestätigung für Kunden vorbereiten (Anfrage, noch nicht final bestätigt)
		    const customerEmailData = {
	      to: email,
	      from: fromEmail,
		      subject: `Buchungsanfrage eingegangen – Atelier Auszeit am ${date} um ${timeDisplay} Uhr`,
          html: bookingRequestCustomerHtml({
            name, date, time: timeDisplay,
            participants,
            participantNames: participantNames.length ? participantNames : undefined,
            notes: notes || undefined,
            cancelUrl,
          }),
          text: `Ihre Buchungsanfrage ist eingegangen\n\nLiebe/r ${name},\n\nwir haben Ihre Anfrage erhalten und melden uns mit der Bestätigung.\n\nDatum: ${date}\nUhrzeit: ${timeDisplay} Uhr\nPersonen: ${participants}\n${participantNamesText}\n${notes ? `Notizen: ${notes}\n` : ''}\nStornierung: ${cancelUrl}\n\nHerzliche Grüße,\nIrena Woschkowiak\nAtelier Auszeit`,
		    };

	    // Kalender-Event erstellen (iCal Format mit korrekter Zeitzone)
    const icalEvent = createICalEvent({
      summary: `Keramik-Termin: ${name}`,
      description: `Buchung für ${participants} Person(en)\nE-Mail: ${email}\nTelefon: ${phone || 'Nicht angegeben'}\nNotizen: ${notes || 'Keine'}`,
      date: slot.date,
      startTime: slot.time,
      endTime: slot.endTime || undefined,
      defaultDurationHours: 2,
    });

    // E-Mail-Versand asynchron im Hintergrund (blockiert nicht die Response)
    let emailSent = false;
    let emailError: string | null = null;

    // E-Mail-Versand im Hintergrund starten (nicht awaiten!)
    if (isSmtpConfigured()) {
      console.log('📧 SMTP konfiguriert, starte E-Mail-Versand im Hintergrund...');

      // Async Funktion die im Hintergrund läuft
      const sendEmails = async () => {
        try {
          console.log('SMTP: Starte E-Mail-Versand...');

          // Nodemailer konfigurieren mit Timeout
          const transporter = createSmtpTransporter();

          // Verbindung testen
          console.log('🔌 Teste SMTP-Verbindung...');
          await transporter.verify();
          console.log('✅ SMTP-Verbindung erfolgreich');

          // E-Mail an Admin senden
          console.log('📧 Sende Admin-E-Mail an:', bookingEmail);
          await transporter.sendMail({
            from: `"Atelier Auszeit - Irena Woschkowiak" <${fromEmail}>`,
            to: bookingEmail,
            subject: adminEmailData.subject,
            text: adminEmailData.text,
            html: adminEmailData.html,
            icalEvent: {
              filename: 'termin.ics',
              method: 'REQUEST',
              content: icalEvent,
            },
          });
          console.log('✅ Admin-E-Mail erfolgreich gesendet');

          // Eingangsbestätigung an Kunden senden
          console.log('📧 Sende Kunden-E-Mail an:', email);
          await transporter.sendMail({
            from: `"Atelier Auszeit - Irena Woschkowiak" <${fromEmail}>`,
            to: customerEmailData.to,
            subject: customerEmailData.subject,
            text: customerEmailData.text,
            html: customerEmailData.html,
          });
          console.log('✅ Kunden-E-Mail erfolgreich gesendet');

        } catch (error: any) {
          console.error('❌ Fehler beim E-Mail-Versand:', error.message);
          console.error('SMTP: E-Mail-Versand fehlgeschlagen');
        }
      };

      // Starte E-Mail-Versand im Hintergrund (nicht awaiten!)
      sendEmails().catch(err => console.error('Background email error:', err));
      emailSent = true; // Wir gehen davon aus, dass es klappt
    } else {
      console.warn('⚠️ SMTP nicht konfiguriert - E-Mail wird nicht gesendet');
      emailError = 'SMTP nicht konfiguriert';
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Buchung erfolgreich erstellt',
        calendarEvent: icalEvent,
        emailSent: emailSent,
        emailError: emailError,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Fehler bei der Buchung:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Fehler bei der Buchung',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

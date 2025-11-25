import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { getTimeSlots, addBooking } from '../../lib/storage';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, participants, date, time, notes } = data;

    // Finde den passenden Slot
    const slots = await getTimeSlots();
    const dateStr = new Date(date).toISOString().split('T')[0];
    const slot = slots.find(s => s.date === dateStr && s.time === time);

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

    if (slot.available < parseInt(participants)) {
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
      email,
      phone: phone || '',
      participants: parseInt(participants),
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
    const bookingEmail = import.meta.env.BOOKING_EMAIL || 'info@auszeit-keramik.de';
    const fromEmail = import.meta.env.FROM_EMAIL || 'buchungen@auszeit-keramik.de';

    // E-Mail-Benachrichtigung vorbereiten
    const emailData = {
      to: bookingEmail,
      from: fromEmail,
      subject: `Neue Buchung: ${name} - ${date} ${time}`,
      html: `
        <h2>Neue Buchungsanfrage</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>E-Mail:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${phone || 'Nicht angegeben'}</p>
        <p><strong>Anzahl Personen:</strong> ${participants}</p>
        <p><strong>Datum:</strong> ${date}</p>
        <p><strong>Uhrzeit:</strong> ${time}</p>
        <p><strong>Notizen:</strong> ${notes || 'Keine'}</p>
      `,
      text: `
Neue Buchungsanfrage

Name: ${name}
E-Mail: ${email}
Telefon: ${phone || 'Nicht angegeben'}
Anzahl Personen: ${participants}
Datum: ${date}
Uhrzeit: ${time}
Notizen: ${notes || 'Keine'}
      `
    };

    // Kalender-Event erstellen (iCal Format)
    const eventDate = new Date(`${date} ${time}`);
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000); // 2 Stunden später
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icalEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Auszeit Keramik Malatelier//Booking//DE
BEGIN:VEVENT
UID:${Date.now()}@auszeit-keramik.de
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(eventDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Keramik-Termin: ${name}
DESCRIPTION:Buchung für ${participants} Person(en)\\nE-Mail: ${email}\\nTelefon: ${phone || 'Nicht angegeben'}\\nNotizen: ${notes || 'Keine'}
LOCATION:Auszeit Keramik Malatelier
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    // Nodemailer konfigurieren
    const transporter = nodemailer.createTransport({
      host: import.meta.env.SMTP_HOST,
      port: parseInt(import.meta.env.SMTP_PORT || '587'),
      secure: false, // true für Port 465, false für andere Ports
      auth: {
        user: import.meta.env.SMTP_USER,
        pass: import.meta.env.SMTP_PASS,
      },
    });

    // E-Mail senden
    try {
      await transporter.sendMail({
        from: `"Auszeit Keramik" <${fromEmail}>`,
        to: bookingEmail,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        icalEvent: {
          filename: 'termin.ics',
          method: 'REQUEST',
          content: icalEvent,
        },
      });

      console.log('E-Mail erfolgreich gesendet an:', bookingEmail);
    } catch (emailError) {
      console.error('Fehler beim E-Mail-Versand:', emailError);
      // Buchung wurde trotzdem gespeichert, nur E-Mail fehlgeschlagen
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Buchung erfolgreich erstellt',
        calendarEvent: icalEvent,
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


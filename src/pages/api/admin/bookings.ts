import type { APIRoute } from 'astro';
import { getBookings, getTimeSlots, cancelBooking, updateBooking } from '../../../lib/storage';
import { FROM_EMAIL, isSmtpConfigured } from '../../../lib/env';
import { createSmtpTransporter } from '../../../lib/smtp';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';
import { logAuditEvent } from '../../../lib/audit-log';
import { validateCredentials } from '../../../lib/totp';
import { createICalEvent } from '../../../lib/ical-helper';
import { getCancelUrl } from '../../../lib/cancel-token';
import { bookingConfirmedCustomerHtml } from '../../../lib/email-templates';

// Authentifizierung - akzeptiert Superuser und Admin
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

// GET - Alle Buchungen (mit Slot-Infos) abrufen
export const GET: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const [bookings, slots] = await Promise.all([getBookings(), getTimeSlots()]);

		const enriched = bookings.map((b) => {
			const slot = slots.find((s) => s.id === b.slotId);
			return {
				...b,
				slotDate: slot?.date ?? null,
				slotTime: slot?.time ?? null,
				slotEndTime: slot?.endTime ?? null,
				slotMaxCapacity: slot?.maxCapacity ?? null,
				slotAvailable: slot?.available ?? null,
			};
		});

		return new Response(JSON.stringify(enriched), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to fetch bookings' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

// POST - Buchung stornieren oder bestätigen
export const POST: APIRoute = async ({ request }) => {
	// Rate limiting for admin actions
	const clientId = getClientIdentifier(request);
	const rateLimit = checkRateLimit(clientId, RATE_LIMITS.ADMIN);
	if (!rateLimit.allowed) {
		await logAuditEvent('RATE_LIMIT_EXCEEDED', request, {
			resource: '/api/admin/bookings',
			action: 'Admin rate limit exceeded',
			success: false,
		});
		return rateLimitResponse(rateLimit);
	}

	if (!checkAuth(request)) {
		await logAuditEvent('UNAUTHORIZED_ACCESS', request, {
			resource: '/api/admin/bookings',
			action: 'Unauthorized admin access attempt',
			success: false,
		});
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const { id, action } = await request.json();

		if (!id) {
			return new Response(JSON.stringify({ error: 'Missing booking ID' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Aktion: Buchung als bestätigt markieren
		if (action === 'confirm') {
			try {
				const updated = await updateBooking(id, { status: 'confirmed' });
				if (!updated) {
					return new Response(JSON.stringify({ error: 'Booking not found' }), {
						status: 404,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				// Log admin action
				await logAuditEvent('ADMIN_ACTION', request, {
					username: 'admin',
					resource: '/api/admin/bookings',
					action: `Booking confirmed: ${id}`,
					success: true,
					extra: { bookingId: id, customerEmail: updated.email },
				});

				// Nach Bestätigung: Zusätzliche Benachrichtigung an Kund:in schicken
				let customerEmailSent = false;
				let emailError: string | null = null;
				try {
					// Slot-Daten für Datum/Uhrzeit laden
					const slots = await getTimeSlots();
					const slot = slots.find((s) => s.id === updated.slotId);

					const date = slot?.date ?? '';
					const timeDisplay = slot
						? (slot.endTime ? `${slot.time} - ${slot.endTime}` : slot.time)
						: '';

					const fromEmail = FROM_EMAIL;

					const customerSubject = date && timeDisplay
						? `Dein Termin wurde bestätigt - Atelier Auszeit am ${date} um ${timeDisplay} Uhr`
						: 'Dein Termin im Atelier Auszeit wurde bestätigt';

					const cancelUrl = getCancelUrl(updated.id, 'booking');

					const customerHtml = bookingConfirmedCustomerHtml({
					name: updated.name,
					date: date || '',
					time: timeDisplay,
					participants: updated.participants,
					notes: updated.notes || undefined,
					cancelUrl,
				});

					const customerText = `
Liebe/r ${updated.name},

wir haben deine Buchung im Atelier Auszeit gerade im System bestätigt.

TERMIN:
${date || ''}${date && timeDisplay ? ' · ' : ''}${timeDisplay || ''}

Teilnehmer: ${updated.participants}
${updated.notes ? `Notizen: ${updated.notes}\n` : ''}

ORT:
Atelier Auszeit
Feldstiege 6a
48599 Gronau

Bei Fragen oder Änderungswünschen erreichst du uns unter:
E-Mail: keramik-auszeit@web.de
Telefon: +49 176 34255005

Falls du deinen Termin nicht wahrnehmen kannst, kannst du ihn hier stornieren:
${cancelUrl}

Herzliche Grüße
Dein Atelier Auszeit
`;

					// Kalender-Event nur mit der finalen Bestätigung mitschicken
					let icalEvent: string | null = null;
					if (slot && slot.date && slot.time) {
						icalEvent = createICalEvent({
							summary: `Keramik-Termin: ${updated.name}`,
							description: `Buchung für ${updated.participants} Person(en)\nE-Mail: ${updated.email}\nTelefon: ${updated.phone || 'Nicht angegeben'}\nNotizen: ${updated.notes || 'Keine'}`,
							date: slot.date,
							startTime: slot.time,
							endTime: slot.endTime || undefined,
							defaultDurationHours: 2,
						});
					}

					if (isSmtpConfigured()) {
						const transporter = createSmtpTransporter();

						// Wir testen hier nicht extra mit verify(), um die Bestätigung im Admin nicht zu blockieren,
						// sondern loggen nur Fehler.
						await transporter.sendMail({
							from: `"Atelier Auszeit - Irena Woschkowiak" <${fromEmail}>`,
							to: updated.email,
							subject: customerSubject,
							text: customerText,
							html: customerHtml,
							...(icalEvent
								? {
									icalEvent: {
										filename: 'termin.ics',
										method: 'REQUEST',
										content: icalEvent,
									},
								}
								: {}),
						});

						customerEmailSent = true;
						console.log('✅ Bestätigungs-E-Mail nach Admin-Bestätigung gesendet an:', updated.email);
					} else {
						console.warn('⚠️ SMTP nicht konfiguriert - Bestätigungs-E-Mail nach Admin-Bestätigung wird nicht gesendet');
						emailError = 'SMTP nicht konfiguriert';
					}
				} catch (err: any) {
					emailError = err?.message || String(err);
					console.error('❌ Fehler beim Versand der Bestätigungs-E-Mail nach Admin-Bestätigung:', err);
				}

				return new Response(JSON.stringify({ success: true, customerEmailSent, emailError }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: 'Failed to confirm booking' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		// Standard: Buchung stornieren (Rückwärtskompatibilität ohne action-Flag)
		const success = await cancelBooking(id);
		if (!success) {
			return new Response(JSON.stringify({ error: 'Booking not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to update booking' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

// PUT - Buchung bearbeiten (z.B. Teilnehmerzahl, Notizen)
export const PUT: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const body = await request.json();
		const { id, name, email, phone, participants, participantNames, notes, status } = body;

		if (!id) {
			return new Response(JSON.stringify({ error: 'Missing booking ID' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const updates: any = {};
		if (typeof name === 'string') updates.name = name;
		if (typeof email === 'string') updates.email = email;
		if (typeof phone === 'string') updates.phone = phone;
		if (typeof participants === 'number') updates.participants = participants;
		if (Array.isArray(participantNames)) {
			updates.participantNames = participantNames
				.map((n: any) => (typeof n === 'string' ? n.trim() : ''))
				.filter((n: string) => n.length > 0);
		}
		if (typeof notes === 'string') updates.notes = notes;
		if (typeof status === 'string') {
			if (status === 'pending' || status === 'confirmed') {
				updates.status = status;
			} else {
				return new Response(JSON.stringify({ error: 'Invalid status value' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		if (Object.keys(updates).length === 0) {
			return new Response(JSON.stringify({ error: 'No updates provided' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		try {
			const updated = await updateBooking(id, updates);
			if (!updated) {
				return new Response(JSON.stringify({ error: 'Booking not found' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response(JSON.stringify({ success: true, booking: updated }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error: any) {
			const message = error instanceof Error ? error.message : String(error);
			if (message === 'NOT_ENOUGH_CAPACITY') {
				return new Response(
					JSON.stringify({ error: 'Nicht genug freie Plätze für diese Änderung.' }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}
			if (message === 'INVALID_PARTICIPANTS') {
				return new Response(
					JSON.stringify({ error: 'Die Teilnehmerzahl muss größer als 0 sein.' }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}
			if (message === 'USE_CANCEL_BOOKING') {
				return new Response(
					JSON.stringify({ error: 'Zum Stornieren bitte die Stornieren-Funktion verwenden.' }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}

			return new Response(JSON.stringify({ error: 'Failed to update booking' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to update booking' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

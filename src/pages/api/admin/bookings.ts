import type { APIRoute } from 'astro';
import { getBookings, getTimeSlots, cancelBooking, updateBooking, addBooking } from '../../../lib/storage';
import { FROM_EMAIL, isSmtpConfigured } from '../../../lib/env';
import { createSmtpTransporter } from '../../../lib/smtp';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, rateLimitResponse } from '../../../lib/rate-limit';
import { logAuditEvent } from '../../../lib/audit-log';
import { validateCredentials } from '../../../lib/totp';
import { createICalEvent } from '../../../lib/ical-helper';
import { getCancelUrl } from '../../../lib/cancel-token';
import { bookingConfirmedCustomerHtml } from '../../../lib/email-templates';
import { notifyBookingCancelled } from '../../../lib/push-notifications';
import { syncBookingToBrenn } from '../../../lib/server/brenn/booking-sync';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeNumber } from '../../../lib/sanitize';

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
		const body = await request.json();
		const { id, action } = body;

		// Aktion: Buchung manuell durch Admin anlegen (z.B. telefonische Buchung)
		if (action === 'create') {
			const name = sanitizeText(body.name);
			const email = sanitizeEmail(body.email);
			const phone = sanitizePhone(body.phone);
			const participants = sanitizeNumber(body.participants, 1, 50);
			const notes = sanitizeText(body.notes);
			const slotId = typeof body.slotId === 'string' ? body.slotId.trim() : '';

			if (!slotId) {
				return new Response(JSON.stringify({ error: 'Bitte einen Termin auswählen.' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (!name) {
				return new Response(JSON.stringify({ error: 'Bitte einen Kundennamen angeben.' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Buchung anlegen (prüft Slot-Existenz + Kapazität, reduziert available)
			const created = await addBooking({
				slotId,
				name,
				email: email || '',
				phone: phone || '',
				participants,
				notes: notes || '',
			});

			if (!created) {
				return new Response(
					JSON.stringify({ error: 'Termin nicht gefunden oder nicht genügend freie Plätze.' }),
					{ status: 400, headers: { 'Content-Type': 'application/json' } },
				);
			}

			// Admin-Buchungen gelten direkt als bestätigt (telefonisch abgesprochen)
			const confirmed = await updateBooking(created.id, { status: 'confirmed' });
			const finalBooking = confirmed || created;

			await logAuditEvent('ADMIN_ACTION', request, {
				username: 'admin',
				resource: '/api/admin/bookings',
				action: `Booking manually created: ${finalBooking.id}`,
				success: true,
				extra: { bookingId: finalBooking.id, customerEmail: finalBooking.email, slotId },
			});

			// Bestätigungs-E-Mail an Kund:in (nur wenn E-Mail vorhanden)
			let customerEmailSent = false;
			let emailError: string | null = null;
			if (finalBooking.email) {
				try {
					const slots = await getTimeSlots();
					const slot = slots.find((s) => s.id === finalBooking.slotId);
					const date = slot?.date ?? '';
					const timeDisplay = slot
						? (slot.endTime ? `${slot.time} - ${slot.endTime}` : slot.time)
						: '';
					const cancelUrl = getCancelUrl(finalBooking.id, 'booking');

					if (isSmtpConfigured()) {
						const transporter = createSmtpTransporter();
						let icalEvent: string | null = null;
						if (slot && slot.date && slot.time) {
							icalEvent = createICalEvent({
								summary: `Keramik-Termin: ${finalBooking.name}`,
								description: `Buchung für ${finalBooking.participants} Person(en)\nE-Mail: ${finalBooking.email}\nTelefon: ${finalBooking.phone || 'Nicht angegeben'}\nNotizen: ${finalBooking.notes || 'Keine'}`,
								date: slot.date,
								startTime: slot.time,
								endTime: slot.endTime || undefined,
								defaultDurationHours: 2,
							});
						}

						await transporter.sendMail({
							from: `"Atelier Auszeit - Irena Woschkowiak" <${FROM_EMAIL}>`,
							to: finalBooking.email,
							subject: date && timeDisplay
								? `Dein Termin wurde bestätigt - Atelier Auszeit am ${date} um ${timeDisplay} Uhr`
								: 'Dein Termin im Atelier Auszeit wurde bestätigt',
							html: bookingConfirmedCustomerHtml({
								name: finalBooking.name,
								date: date || '',
								time: timeDisplay,
								participants: finalBooking.participants,
								notes: finalBooking.notes || undefined,
								cancelUrl,
							}),
							text: `Liebe/r ${finalBooking.name},\n\nwir haben deine Buchung im Atelier Auszeit eingetragen und bestätigt.\n\nTERMIN:\n${date || ''}${date && timeDisplay ? ' · ' : ''}${timeDisplay || ''}\n\nTeilnehmer: ${finalBooking.participants}\n${finalBooking.notes ? `Notizen: ${finalBooking.notes}\n` : ''}\nORT:\nAtelier Auszeit\nFeldstiege 6a\n48599 Gronau\n\nFalls du den Termin nicht wahrnehmen kannst: ${cancelUrl}\n\nHerzliche Grüße\nDein Atelier Auszeit`,
							...(icalEvent ? { icalEvent: { filename: 'termin.ics', method: 'REQUEST', content: icalEvent } } : {}),
						});
						customerEmailSent = true;
					} else {
						emailError = 'SMTP nicht konfiguriert';
					}
				} catch (err: any) {
					emailError = err?.message || String(err);
					console.error('❌ Fehler beim Versand der Bestätigungs-E-Mail (Admin-Buchung):', err);
				}
			}

			return new Response(
				JSON.stringify({ success: true, booking: finalBooking, customerEmailSent, emailError }),
				{ status: 201, headers: { 'Content-Type': 'application/json' } },
			);
		}

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
E-Mail: atelier@keramik-auszeit.de
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

				// Brenn-Verwaltung: Kunden + Aufträge automatisch erstellen
				let brennSync = { synced: false, customersCreated: 0, ordersCreated: 0, reason: '' };
				try {
					const allSlots = await getTimeSlots();
					const bookingSlot = allSlots.find((s) => s.id === updated.slotId);
					brennSync = await syncBookingToBrenn({
						id: updated.id,
						name: updated.name,
						email: updated.email,
						phone: updated.phone,
						participants: updated.participants,
						participantNames: updated.participantNames,
						date: bookingSlot?.date,
					});
				} catch (err: any) {
					console.error('[Brenn-Sync] Fehler bei Buchung', id, ':', err.message);
				}

				return new Response(JSON.stringify({ success: true, customerEmailSent, emailError, brennSync }), {
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
		// Buchungsinfos für Push-Notification holen bevor storniert wird
		const [bookings, slots] = await Promise.all([getBookings(), getTimeSlots()]);
		const bookingToCancel = bookings.find(b => b.id === id);

		const success = await cancelBooking(id);
		if (!success) {
			return new Response(JSON.stringify({ error: 'Booking not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Push-Notification über Stornierung
		if (bookingToCancel) {
			const slot = slots.find(s => s.id === bookingToCancel.slotId);
			notifyBookingCancelled(bookingToCancel.name, slot?.date).catch(err => console.error('Push error:', err));
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

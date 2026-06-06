import type { APIRoute } from 'astro';
import { getTimeSlots, addTimeSlot, deleteTimeSlot, updateTimeSlot, type TimeSlot } from '../../../lib/storage';
import { validateCredentials } from '../../../lib/totp';

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

// GET - Alle Zeitslots abrufen
export const GET: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const slots = await getTimeSlots();
		return new Response(JSON.stringify(slots), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to fetch slots' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

// POST - Neuen Zeitslot erstellen
export const POST: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const data = await request.json();
		const validEventTypes = ['normal', 'kindergeburtstag', 'stammtisch'];

		// Einen einzelnen Slot-Datensatz aus rohem Input bauen + validieren.
		// Gibt entweder { slot } oder { error } zurück.
		const buildSlot = (raw: any): { slot?: Omit<TimeSlot, 'id' | 'createdAt'>; error?: string } => {
			const { date, time, startTime, endTime, maxCapacity, initialBooked, eventType } = raw || {};
			const slotTime = startTime || time;

			if (!date || !slotTime || maxCapacity == null) {
				return { error: 'Missing required fields' };
			}

			const totalCapacity = parseInt(String(maxCapacity), 10);
			const alreadyBooked = initialBooked != null && initialBooked !== ''
				? parseInt(String(initialBooked), 10)
				: 0;

			if (Number.isNaN(totalCapacity) || totalCapacity <= 0) {
				return { error: 'Invalid maxCapacity' };
			}
			if (Number.isNaN(alreadyBooked) || alreadyBooked < 0 || alreadyBooked > totalCapacity) {
				return { error: 'Invalid initialBooked value' };
			}

			return {
				slot: {
					date,
					time: slotTime,
					endTime: endTime || undefined,
					maxCapacity: totalCapacity,
					available: totalCapacity - alreadyBooked,
					eventType: validEventTypes.includes(eventType) ? eventType : 'normal',
				},
			};
		};

		// Batch-Modus: Array von Slots (Serien-Slots aus der App)
		if (Array.isArray(data.slots)) {
			const rawSlots = data.slots as any[];
			if (rawSlots.length === 0) {
				return new Response(JSON.stringify({ error: 'Keine Termine übergeben' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (rawSlots.length > 200) {
				return new Response(JSON.stringify({ error: 'Zu viele Termine auf einmal (max. 200)' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const created: TimeSlot[] = [];
			for (const raw of rawSlots) {
				const { slot, error } = buildSlot(raw);
				if (error || !slot) {
					return new Response(JSON.stringify({ error: `Ungültiger Termin: ${error}` }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				created.push(await addTimeSlot(slot));
			}

			return new Response(JSON.stringify({ success: true, created: created.length, slots: created }), {
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Einzel-Modus (Rückwärtskompatibilität)
		const { slot, error } = buildSlot(data);
		if (error || !slot) {
			return new Response(JSON.stringify({ error: error || 'Invalid slot' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const newSlot = await addTimeSlot(slot);
		return new Response(JSON.stringify(newSlot), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to create slot' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

// DELETE - Zeitslot löschen
export const DELETE: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const { id } = await request.json();

		if (!id) {
			return new Response(JSON.stringify({ error: 'Missing slot ID' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const success = await deleteTimeSlot(id);

		if (!success) {
			return new Response(JSON.stringify({ error: 'Slot not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to delete slot' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

// PUT - Zeitslot aktualisieren
export const PUT: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const body = await request.json();
		const { id, date, time, startTime, endTime, maxCapacity, eventType, initialBooked } = body as any;

		if (!id) {
			return new Response(JSON.stringify({ error: 'Missing slot ID' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Aktuellen Slot laden, um bestehende Buchungen zu berücksichtigen
		const allSlots = await getTimeSlots();
		const existing = allSlots.find((s) => s.id === id);
		if (!existing) {
			return new Response(JSON.stringify({ error: 'Slot not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const updates: Partial<TimeSlot> = {};

		if (date) {
			updates.date = date;
		}

		// Unterstützt sowohl altes "time" als auch neues "startTime"
		const newTime = startTime || time;
		if (newTime) {
			updates.time = newTime;
		}

		if (typeof endTime !== 'undefined') {
			updates.endTime = endTime || undefined;
		}

		// Event-Typ aktualisieren
		if (typeof eventType !== 'undefined') {
			const validEventTypes = ['normal', 'kindergeburtstag', 'stammtisch'];
			if (validEventTypes.includes(eventType)) {
				updates.eventType = eventType;
			}
		}

		if (typeof maxCapacity !== 'undefined' && maxCapacity !== null) {
			const newMax = parseInt(String(maxCapacity), 10);
			if (Number.isNaN(newMax) || newMax <= 0) {
				return new Response(JSON.stringify({ error: 'Invalid maxCapacity' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// Wenn initialBooked übergeben wird, verwende diesen Wert, sonst den bestehenden
			let alreadyBooked: number;
			if (typeof initialBooked !== 'undefined' && initialBooked !== null) {
				alreadyBooked = parseInt(String(initialBooked), 10);
				if (Number.isNaN(alreadyBooked) || alreadyBooked < 0) {
					alreadyBooked = 0;
				}
			} else {
				alreadyBooked = existing.maxCapacity - existing.available;
			}

			if (newMax < alreadyBooked) {
				return new Response(
					JSON.stringify({
						error:
							'Neue maximale Teilnehmerzahl darf bestehende Buchungen nicht unterschreiten.',
					}),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}

			updates.maxCapacity = newMax;
			updates.available = newMax - alreadyBooked;
		} else if (typeof initialBooked !== 'undefined' && initialBooked !== null) {
			// Nur initialBooked geändert, maxCapacity bleibt gleich
			const alreadyBooked = parseInt(String(initialBooked), 10);
			if (!Number.isNaN(alreadyBooked) && alreadyBooked >= 0) {
				if (existing.maxCapacity < alreadyBooked) {
					return new Response(
						JSON.stringify({
							error: 'Gebuchte Plätze können nicht größer als maximale Kapazität sein.',
						}),
						{
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						},
					);
				}
				updates.available = existing.maxCapacity - alreadyBooked;
			}
		}

		const updatedSlot = await updateTimeSlot(id, updates);

		if (!updatedSlot) {
			return new Response(JSON.stringify({ error: 'Slot not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify(updatedSlot), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to update slot' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};


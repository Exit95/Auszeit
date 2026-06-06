import type { APIRoute } from 'astro';
import { getBlockedDates, addBlockedDate, deleteBlockedDate } from '../../../lib/storage';
import { validateCredentials } from '../../../lib/totp';
import { sanitizeText, sanitizeDate } from '../../../lib/sanitize';

// Authentifizierung - akzeptiert Superuser und Admin (analog zu slots.ts)
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

// GET - Alle gesperrten Zeiträume abrufen (neueste zuerst)
export const GET: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const dates = await getBlockedDates();
		dates.sort((a, b) => b.from.localeCompare(a.from));
		return new Response(JSON.stringify(dates), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to fetch blocked dates' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

// POST - Neuen gesperrten Zeitraum anlegen
export const POST: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const body = await request.json();
		const from = sanitizeDate(body.from);
		const to = sanitizeDate(body.to);
		const reason = sanitizeText(body.reason);

		if (!from || !to) {
			return new Response(JSON.stringify({ error: 'Von- und Bis-Datum im Format JJJJ-MM-TT angeben.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (to < from) {
			return new Response(JSON.stringify({ error: 'Bis-Datum muss nach dem Von-Datum liegen.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const created = await addBlockedDate({ from, to, reason: reason || undefined });
		return new Response(JSON.stringify(created), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to create blocked date' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

// DELETE - Gesperrten Zeitraum aufheben (ID im Body)
export const DELETE: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const { id } = await request.json();
		if (!id) {
			return new Response(JSON.stringify({ error: 'Missing id' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const success = await deleteBlockedDate(id);
		if (!success) {
			return new Response(JSON.stringify({ error: 'Zeitraum nicht gefunden' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Failed to delete blocked date' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

import type { APIRoute } from 'astro';
import { validateCredentials } from '../../../lib/totp';
import { getPushTokens, savePushToken } from '../../../lib/push-notifications';

function checkAuth(request: Request): boolean {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader) return false;
	const [type, credentials] = authHeader.split(' ');
	if (type !== 'Basic') return false;
	const decoded = Buffer.from(credentials, 'base64').toString();
	const [username, password] = decoded.split(':');
	return validateCredentials(username, password).valid;
}

export const POST: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	try {
		const { token, platform } = await request.json();

		if (!token || typeof token !== 'string') {
			return new Response(JSON.stringify({ error: 'Token fehlt' }), { status: 400 });
		}

		await savePushToken(token, platform || 'unknown');

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[Push-Token] Fehler:', error);
		return new Response(JSON.stringify({ error: 'Speichern fehlgeschlagen' }), { status: 500 });
	}
};

export const GET: APIRoute = async ({ request }) => {
	if (!checkAuth(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const tokens = await getPushTokens();
	return new Response(JSON.stringify(tokens), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

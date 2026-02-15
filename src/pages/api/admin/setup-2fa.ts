import type { APIRoute } from 'astro';
import { getTotpSecret, generateOtpAuthUrl, isSuperuser } from '../../../lib/totp';
import QRCode from 'qrcode';

/**
 * 2FA Setup Endpoint
 * Only accessible by superuser (developer)
 * Generates QR code for admin to scan with authenticator app
 */
export const GET: APIRoute = async ({ request }) => {
  // Only superuser can access this endpoint
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [type, credentials] = authHeader.split(' ');
  if (type !== 'Basic') {
    return new Response(JSON.stringify({ error: 'Invalid auth type' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const decoded = Buffer.from(credentials, 'base64').toString();
  const [username, password] = decoded.split(':');

  // Only superuser can access setup
  if (!isSuperuser(username, password)) {
    return new Response(JSON.stringify({ error: 'Only superuser can access 2FA setup' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const secret = getTotpSecret();
  
  if (!secret) {
    return new Response(JSON.stringify({ 
      error: 'TOTP_SECRET not configured',
      message: 'Bitte TOTP_SECRET in den Umgebungsvariablen setzen'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Generate OTP Auth URL
    const otpAuthUrl = generateOtpAuthUrl(secret, 'admin@keramik-auszeit.de');
    
    // Generate QR Code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Return HTML page with QR code
    const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2FA Setup - Keramik Auszeit</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; padding: 1rem; text-align: center; }
    h1 { color: #8b4513; }
    .qr-container { background: #f5f5f5; padding: 2rem; border-radius: 1rem; margin: 2rem 0; }
    .secret { font-family: monospace; font-size: 1.2rem; background: #fff; padding: 1rem; border-radius: 0.5rem; word-break: break-all; }
    .instructions { text-align: left; background: #fff8dc; padding: 1.5rem; border-radius: 0.5rem; margin: 1rem 0; }
    .instructions ol { margin: 0; padding-left: 1.5rem; }
    .instructions li { margin: 0.5rem 0; }
    .warning { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <h1>🔐 2FA Einrichtung</h1>
  <p>Für Admin-Login (Kundin)</p>
  
  <div class="qr-container">
    <img src="${qrCodeDataUrl}" alt="QR Code für 2FA" />
  </div>
  
  <div class="instructions">
    <h3>Anleitung:</h3>
    <ol>
      <li>Installiere <strong>Google Authenticator</strong> oder <strong>Microsoft Authenticator</strong> auf deinem Handy</li>
      <li>Öffne die App und wähle "Konto hinzufügen" oder "+"</li>
      <li>Scanne den QR-Code oben</li>
      <li>Die App zeigt nun alle 30 Sekunden einen neuen 6-stelligen Code an</li>
      <li>Diesen Code muss bei jedem Admin-Login eingegeben werden</li>
    </ol>
  </div>
  
  <h3>Manueller Schlüssel (falls QR-Code nicht funktioniert):</h3>
  <div class="secret">${secret}</div>
  
  <p class="warning">⚠️ Diesen Schlüssel niemals weitergeben oder veröffentlichen!</p>
  <p><a href="/admin">← Zurück zum Admin-Bereich</a></p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return new Response(JSON.stringify({ error: 'QR Code generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};


/**
 * Zentrale E-Mail-Templates für Atelier Auszeit
 * Alle Mails teilen dasselbe Markenbild und Layout.
 */

// ── Farb-Konstanten ────────────────────────────────────────────────────────────
const C = {
  bg:         '#f2ede8',
  card:       '#ffffff',
  header:     '#3d2a1e',
  accent:     '#c9956e',
  accentDark: '#a5734f',
  primary:    '#5b3e31',
  box:        '#faf7f4',
  boxBorder:  '#e5d9ce',
  text:       '#3d2a1e',
  muted:      '#7a6459',
  subtle:     '#a89890',
  danger:     '#c0392b',
  divider:    '#e5d9ce',
};

// ── Basis-Shell ────────────────────────────────────────────────────────────────
function shell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Atelier Auszeit</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
         style="background:${C.bg};padding:40px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
             style="max-width:600px;width:100%;background:${C.card};border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">

        <!-- Header -->
        <tr>
          <td style="background:${C.header};padding:36px 40px 30px;text-align:center;">
            <p style="margin:0 0 6px;color:${C.accent};font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;">Handbemalte Keramik · Gronau</p>
            <h1 style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:normal;letter-spacing:2px;">Atelier Auszeit</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.35);font-size:12px;letter-spacing:1px;">— Irena Woschkowiak —</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${C.box};border-top:1px solid ${C.divider};padding:24px 40px;text-align:center;">
            <p style="margin:0 0 4px;color:${C.primary};font-size:13px;font-weight:600;">Atelier Auszeit · Irena Woschkowiak</p>
            <p style="margin:0;color:${C.muted};font-size:12px;line-height:1.7;">
              Feldstiege 6a · 48599 Gronau<br>
              <a href="mailto:keramik-auszeit@web.de" style="color:${C.accent};text-decoration:none;">keramik-auszeit@web.de</a>
              &nbsp;·&nbsp;
              <a href="tel:+4917634255005" style="color:${C.accent};text-decoration:none;">+49 176 34255005</a>
            </p>
          </td>
        </tr>

      </table>
      <!-- / Card -->

    </td></tr>
  </table>

</body>
</html>`;
}

// ── Kleine Helfer ──────────────────────────────────────────────────────────────
function h2(text: string): string {
  return `<h2 style="margin:0 0 16px;color:${C.primary};font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;">${text}</h2>`;
}

function greeting(name: string): string {
  return `<p style="margin:0 0 16px;color:${C.text};font-size:15px;line-height:1.6;">Liebe/r <strong>${name}</strong>,</p>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 14px;color:${C.text};font-size:15px;line-height:1.65;">${text}</p>`;
}

function infoBox(rows: { label: string; value: string }[]): string {
  const cells = rows
    .filter(r => r.value)
    .map(r => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid ${C.divider};color:${C.muted};font-size:13px;font-weight:600;white-space:nowrap;width:35%;">${r.label}</td>
        <td style="padding:10px 16px;border-bottom:1px solid ${C.divider};color:${C.text};font-size:14px;">${r.value}</td>
      </tr>`)
    .join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
         style="border:1px solid ${C.boxBorder};border-radius:10px;overflow:hidden;margin:20px 0;">
    <tr style="background:${C.box};">
      <td colspan="2" style="padding:12px 16px;border-bottom:1px solid ${C.divider};">
        <span style="color:${C.accent};font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Ihre Angaben</span>
      </td>
    </tr>
    ${cells}
  </table>`;
}

function divider(): string {
  return `<div style="border-top:1px solid ${C.divider};margin:28px 0;"></div>`;
}

function cancelLink(url: string): string {
  return `
  <p style="margin:0;color:${C.subtle};font-size:12px;line-height:1.6;">
    Falls Sie Ihre Buchung nicht wahrnehmen können, können Sie diese jederzeit stornieren:<br>
    <a href="${url}" style="color:${C.danger};text-decoration:underline;">Buchung stornieren</a>
  </p>`;
}

function signature(): string {
  return `<p style="margin:28px 0 0;color:${C.text};font-size:15px;line-height:1.7;">Herzliche Grüße,<br><strong>Irena Woschkowiak</strong><br><span style="color:${C.muted};font-size:13px;">Atelier Auszeit</span></p>`;
}

function adminBadge(label: string): string {
  return `<p style="margin:0 0 20px;display:inline-block;background:${C.accent};color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">${label}</p>`;
}

function adminInfoBox(rows: { label: string; value: string }[]): string {
  const cells = rows
    .filter(r => r.value)
    .map(r => `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid ${C.divider};color:${C.muted};font-size:13px;font-weight:600;white-space:nowrap;width:35%;">${r.label}</td>
        <td style="padding:9px 16px;border-bottom:1px solid ${C.divider};color:${C.text};font-size:14px;">${r.value}</td>
      </tr>`)
    .join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
         style="border:1px solid ${C.boxBorder};border-radius:10px;overflow:hidden;margin:16px 0 24px;">
    ${cells}
  </table>`;
}

// ── Öffentliche Template-Funktionen ───────────────────────────────────────────

/**
 * 1. Buchungsanfrage-Bestätigung → Kunde
 */
export function bookingRequestCustomerHtml(p: {
  name: string;
  date: string;
  time: string;
  participants: number;
  participantNames?: string[];
  notes?: string;
  cancelUrl: string;
}): string {
  const namesHtml = p.participantNames?.length
    ? `<p style="margin:0 0 4px;color:${C.muted};font-size:13px;font-weight:600;">Teilnehmernamen</p>
       <ol style="margin:0 0 12px;padding-left:20px;color:${C.text};font-size:14px;">${p.participantNames.map(n => `<li>${n}</li>`).join('')}</ol>`
    : '';

  const body = `
    ${h2('Ihre Anfrage ist eingegangen')}
    ${greeting(p.name)}
    ${para('vielen Dank für Ihre Buchungsanfrage! Wir haben diese erhalten und werden uns so schnell wie möglich bei Ihnen melden.')}
    ${para('Sie erhalten eine <strong>separate Bestätigungs-E-Mail</strong>, sobald wir Ihren Termin fest eingeplant haben.')}
    ${infoBox([
      { label: 'Datum',    value: p.date },
      { label: 'Uhrzeit', value: p.time + ' Uhr' },
      { label: 'Personen', value: String(p.participants) },
      { label: 'Notizen', value: p.notes || '' },
    ])}
    ${namesHtml}
    ${divider()}
    ${cancelLink(p.cancelUrl)}
    ${signature()}
  `;

  return shell(body);
}

/**
 * 2. Admin-Benachrichtigung: neue Buchungsanfrage
 */
export function bookingRequestAdminHtml(p: {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  participants: number;
  participantNames?: string[];
  notes?: string;
}): string {
  const namesHtml = p.participantNames?.length
    ? `<p style="margin:12px 0 4px;color:${C.muted};font-size:13px;font-weight:600;">Teilnehmernamen</p>
       <ol style="margin:0;padding-left:20px;color:${C.text};font-size:14px;">${p.participantNames.map(n => `<li>${n}</li>`).join('')}</ol>`
    : '';

  const body = `
    ${adminBadge('Neue Buchungsanfrage')}
    ${adminInfoBox([
      { label: 'Name',     value: p.name },
      { label: 'E-Mail',   value: p.email },
      { label: 'Telefon',  value: p.phone || 'Nicht angegeben' },
      { label: 'Datum',    value: p.date },
      { label: 'Uhrzeit',  value: p.time + ' Uhr' },
      { label: 'Personen', value: String(p.participants) },
      { label: 'Notizen',  value: p.notes || 'Keine' },
    ])}
    ${namesHtml}
    ${para('Bitte im <strong>Admin-Panel</strong> bestätigen oder ablehnen.')}
  `;

  return shell(body);
}

/**
 * 3. Buchungsbestätigung nach Admin-Freigabe → Kunde
 */
export function bookingConfirmedCustomerHtml(p: {
  name: string;
  date: string;
  time: string;
  participants: number;
  notes?: string;
  cancelUrl: string;
}): string {
  const body = `
    ${h2('Ihr Termin ist bestätigt! ✓')}
    ${greeting(p.name)}
    ${para('wir freuen uns, Ihren Termin im Atelier Auszeit offiziell zu bestätigen. Wir sind gespannt auf Ihr Werk!')}
    ${infoBox([
      { label: 'Datum',    value: p.date },
      { label: 'Uhrzeit', value: p.time + ' Uhr' },
      { label: 'Personen', value: String(p.participants) },
      { label: 'Ort',     value: 'Atelier Auszeit, Feldstiege 6a, 48599 Gronau' },
      { label: 'Notizen', value: p.notes || '' },
    ])}
    ${para('Bitte kommen Sie <strong>pünktlich</strong>. Farben, Pinsel und der Glasurbrand sind im Kurspreis bereits enthalten.')}
    ${para('Bei Fragen erreichen Sie uns jederzeit per E-Mail oder Telefon. Wir helfen gerne.')}
    ${divider()}
    ${cancelLink(p.cancelUrl)}
    ${signature()}
  `;

  return shell(body);
}

/**
 * 4. Stornierungsbestätigung → Kunde
 */
export function bookingCancelledCustomerHtml(p: {
  name: string;
  date?: string;
  time?: string;
}): string {
  const dateRow = p.date ? infoBox([
    { label: 'Datum',    value: p.date },
    { label: 'Uhrzeit', value: p.time ? p.time + ' Uhr' : '' },
  ]) : '';

  const body = `
    ${h2('Ihre Buchung wurde storniert')}
    ${greeting(p.name)}
    ${para('Ihre Buchung wurde erfolgreich storniert. Der Termin ist damit wieder freigegeben.')}
    ${dateRow}
    ${para('Falls Sie einen neuen Termin buchen möchten, besuchen Sie gerne unsere Webseite oder schreiben uns eine E-Mail.')}
    ${para('Wir hoffen, Sie bald bei uns im Atelier begrüßen zu dürfen!')}
    ${signature()}
  `;

  return shell(body);
}

/**
 * 5. Anfrage-Bestätigung (Besondere Anlässe) → Kunde
 */
export function inquiryCustomerHtml(p: {
  name: string;
  eventLabel: string;
  preferredDate?: string;
  participants: number;
  message?: string;
}): string {
  const body = `
    ${h2('Ihre Anfrage ist eingegangen')}
    ${greeting(p.name)}
    ${para('vielen Dank für Ihre Anfrage! Wir haben diese erhalten und werden uns zeitnah bei Ihnen melden, um alle Details gemeinsam zu besprechen.')}
    ${infoBox([
      { label: 'Anlass',      value: p.eventLabel },
      { label: 'Wunschdatum', value: p.preferredDate || 'Flexibel' },
      { label: 'Personen',    value: String(p.participants) },
      { label: 'Nachricht',   value: p.message || '' },
    ])}
    ${para('Wir gestalten Ihren besonderen Anlass individuell und freuen uns darauf, etwas Einzigartiges mit Ihnen zu kreieren.')}
    ${signature()}
  `;

  return shell(body);
}

/**
 * 6. Gutschein-Bestätigung → Kunde
 */
export function voucherPurchasedCustomerHtml(p: {
  code: string;
  amount: string;
  qrDataUrl: string;
  redeemUrl: string;
  customerName?: string;
}): string {
  const body = `
    ${h2('Dein Gutschein ist da!')}
    ${p.customerName ? greeting(p.customerName) : ''}
    ${para('Vielen Dank für deinen Kauf! Dein Gutschein ist sofort gültig und kann jederzeit im Atelier eingelöst werden.')}

    <div style="background:white;border:2px dashed ${C.accent};border-radius:14px;padding:28px 20px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 6px;color:${C.muted};font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Gutschein-Code</p>
      <p style="margin:0 0 12px;color:${C.header};font-size:26px;font-weight:bold;font-family:monospace;letter-spacing:3px;">${p.code}</p>
      <div style="width:60px;border-top:1px solid ${C.divider};margin:0 auto 12px;"></div>
      <p style="margin:0;color:${C.header};font-size:34px;font-weight:bold;">${p.amount}</p>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <img src="${p.qrDataUrl}" alt="QR-Code zum Einl\u00f6sen" width="180" height="180" style="border-radius:10px;" />
      <p style="margin:8px 0 0;color:${C.muted};font-size:12px;">QR-Code im Atelier vorzeigen</p>
    </div>

    ${para('Zeige diesen Gutschein einfach im Atelier vor \u2013 der QR-Code kann direkt gescannt werden.')}
    ${divider()}
    <p style="margin:0;color:${C.subtle};font-size:12px;line-height:1.6;">
      Einl\u00f6se-Link: <a href="${p.redeemUrl}" style="color:${C.accent};text-decoration:underline;">${p.redeemUrl}</a>
    </p>
    ${signature()}
  `;

  return shell(body);
}

/**
 * 7. Admin-Benachrichtigung: neue Anfrage (Besondere Anlässe)
 */
export function inquiryAdminHtml(p: {
  name: string;
  email: string;
  phone: string;
  eventLabel: string;
  preferredDate?: string;
  participants: number;
  message?: string;
}): string {
  const body = `
    ${adminBadge('Neue Anfrage · Besonderer Anlass')}
    ${adminInfoBox([
      { label: 'Anlass',      value: p.eventLabel },
      { label: 'Name',        value: p.name },
      { label: 'E-Mail',      value: p.email },
      { label: 'Telefon',     value: p.phone || 'Nicht angegeben' },
      { label: 'Wunschdatum', value: p.preferredDate || 'Flexibel' },
      { label: 'Personen',    value: String(p.participants) },
      { label: 'Nachricht',   value: p.message || 'Keine Nachricht' },
    ])}
    ${para('Bitte im <strong>Admin-Panel</strong> unter "Anfragen" bearbeiten und den Kunden kontaktieren.')}
  `;

  return shell(body);
}

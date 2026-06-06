/**
 * Benachrichtigungen für die Brennverwaltung
 * - E-Mail wenn Keramik abholbereit ist
 * - Überfällige-Abholung-Erinnerungen (14 / 35 Tage)
 * - Bewertungs-E-Mail nach erfolgreicher Abholung (Feature 12)
 */

import { createSmtpTransporter } from '../../smtp';
import { isSmtpConfigured, FROM_EMAIL } from '../../env';
import { getPool } from '../../database';

interface PickupNotificationData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  referenceCode: string;
  storageCode?: string;
}

// ─── Konstanten ──────────────────────────────────────────────────────────────

/** Atelier-Adresse und Kontakt — einmalig gepflegt, überall genutzt. */
const ATELIER = {
  name:    'Malatelier Auszeit',
  owner:   'Irena Woschkowiak',
  street:  'Feldstiege 6a',
  city:    '48599 Gronau (Westfalen)',
  phone:   '+49 176 34255005',
  email:   'atelier@keramik-auszeit.de',
  website: 'https://keramik-auszeit.de',
  /** Direktlink zur Google-Bewertungsseite des Ateliers. */
  googleReviewUrl: 'https://g.page/r/CbDQ3tPQ2PICEAE/review',
};

/** Wiederverwendbarer E-Mail-Rahmen (Header + Footer). */
function emailWrapper(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #EDE4DA; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EDE4DA; padding: 32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FAF7F2; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(66,52,48,0.08);">

        <!-- Header -->
        <tr><td style="height: 6px; background: linear-gradient(90deg, #A0522D, #D96C4A, #A0522D);"></td></tr>
        <tr><td style="padding: 32px 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; color: #423430; letter-spacing: 1px;">${ATELIER.name}</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: #A0522D; letter-spacing: 2px; text-transform: uppercase;">Keramik-Malatelier in Gronau</p>
        </td></tr>
        <tr><td style="padding: 0 40px;"><div style="height: 1px; background: #E0D6CC;"></div></td></tr>

        <!-- Inhalt -->
        ${bodyHtml}

        <!-- Footer -->
        <tr><td style="padding: 0 40px;"><div style="height: 1px; background: #E0D6CC;"></div></td></tr>
        <tr><td style="padding: 24px 40px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #9B8E88;">${ATELIER.name} · ${ATELIER.owner}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #9B8E88;">${ATELIER.street} · ${ATELIER.city}</p>
          <p style="margin: 4px 0; font-size: 13px;">
            <a href="tel:${ATELIER.phone.replace(/\s/g, '')}" style="color: #A0522D; text-decoration: none;">${ATELIER.phone}</a>
            &nbsp;·&nbsp;
            <a href="mailto:${ATELIER.email}" style="color: #A0522D; text-decoration: none;">${ATELIER.email}</a>
          </p>
          <p style="margin: 12px 0 0; font-size: 12px; color: #C4B5A8;">
            <a href="${ATELIER.website}" style="color: #A0522D; text-decoration: none;">${ATELIER.website.replace('https://', '')}</a>
          </p>
        </td></tr>
        <tr><td style="height: 4px; background: linear-gradient(90deg, #A0522D, #D96C4A, #A0522D);"></td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sendet E-Mail an Kunden wenn Keramik abholbereit ist.
 * Setzt pickup_notified_at auf dem Auftrag.
 */
export async function sendPickupReadyEmail(data: PickupNotificationData): Promise<boolean> {
  if (!isSmtpConfigured() || !data.customerEmail) {
    console.log(`[Brenn-Notify] Übersprungen: ${!data.customerEmail ? 'Keine E-Mail' : 'SMTP nicht konfiguriert'}`);
    return false;
  }

  try {
    const transporter = createSmtpTransporter();

    const subject = `Deine Keramik ist fertig! Auftrag ${data.referenceCode}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #EDE4DA; font-family: Georgia, 'Times New Roman', serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EDE4DA; padding: 32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FAF7F2; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(66,52,48,0.08);">

        <!-- Header mit Terracotta-Streifen -->
        <tr><td style="height: 6px; background: linear-gradient(90deg, #A0522D, #D96C4A, #A0522D);"></td></tr>

        <!-- Logo-Bereich -->
        <tr><td style="padding: 32px 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; color: #423430; letter-spacing: 1px;">Malatelier Auszeit</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: #A0522D; letter-spacing: 2px; text-transform: uppercase;">Keramik-Malatelier in Gronau</p>
        </td></tr>

        <!-- Trennlinie -->
        <tr><td style="padding: 0 40px;"><div style="height: 1px; background: #E0D6CC;"></div></td></tr>

        <!-- Hauptinhalt -->
        <tr><td style="padding: 28px 40px;">
          <p style="font-size: 17px; color: #423430; margin: 0 0 16px;">Hallo ${data.customerName},</p>

          <p style="font-size: 16px; color: #423430; line-height: 1.7; margin: 0 0 24px;">
            wunderbar! Deine Keramik wurde gebrannt und wartet jetzt auf dich.
          </p>

          <!-- Abholbereit-Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
            <tr><td style="background: #423430; border-radius: 12px; padding: 24px 28px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #D4956A; letter-spacing: 2px; text-transform: uppercase;">Dein Auftrag</p>
              <p style="margin: 0 0 12px; font-size: 28px; font-weight: bold; color: #FFFFFF;">${data.referenceCode}</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: #D96C4A; color: #FFFFFF; font-size: 14px; font-weight: bold; padding: 8px 20px; border-radius: 20px; letter-spacing: 0.5px;">
                    Abholbereit
                  </td>
                </tr>
              </table>
              ${data.storageCode ? `<p style="margin: 12px 0 0; font-size: 14px; color: #D4956A;">Lagerort: ${data.storageCode}</p>` : ''}
            </td></tr>
          </table>

          <!-- Öffnungszeiten -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
            <tr><td style="background: #FAF7F2; border: 1px solid #E0D6CC; border-radius: 10px; padding: 20px 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #A0522D; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Abholung</p>
              <p style="margin: 0; font-size: 15px; color: #423430; line-height: 1.6;">
                Montag bis Freitag: 10:00 bis 18:00 Uhr<br>
                Samstag: 10:00 bis 16:00 Uhr
              </p>
            </td></tr>
          </table>

          <p style="font-size: 15px; color: #6B5D56; line-height: 1.7; margin: 0 0 8px;">
            Wir freuen uns, dir dein fertiges Werkstück zu zeigen!
          </p>

          <p style="font-size: 13px; color: #9B8E88; line-height: 1.6; margin: 0;">
            Bitte hole deine Keramik innerhalb von 6 Wochen ab. Nicht abgeholte Keramik wird danach gespendet.
          </p>
        </td></tr>

        <!-- Trennlinie -->
        <tr><td style="padding: 0 40px;"><div style="height: 1px; background: #E0D6CC;"></div></td></tr>

        <!-- Footer -->
        <tr><td style="padding: 24px 40px; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #9B8E88;">Malatelier Auszeit · Irena Woschkowiak</p>
          <p style="margin: 4px 0; font-size: 13px; color: #9B8E88;">Feldstiege 6a · 48599 Gronau</p>
          <p style="margin: 4px 0; font-size: 13px;">
            <a href="tel:+4917634255005" style="color: #A0522D; text-decoration: none;">+49 176 34255005</a>
            &nbsp;·&nbsp;
            <a href="mailto:atelier@keramik-auszeit.de" style="color: #A0522D; text-decoration: none;">atelier@keramik-auszeit.de</a>
          </p>
          <p style="margin: 12px 0 0; font-size: 12px; color: #C4B5A8;">
            <a href="https://keramik-auszeit.de" style="color: #A0522D; text-decoration: none;">keramik-auszeit.de</a>
          </p>
        </td></tr>

        <!-- Bottom Terracotta-Streifen -->
        <tr><td style="height: 4px; background: linear-gradient(90deg, #A0522D, #D96C4A, #A0522D);"></td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = `Hallo ${data.customerName},

deine Keramik wurde gebrannt und ist jetzt abholbereit!

Auftrag: ${data.referenceCode}
${data.storageCode ? `Lagerort: ${data.storageCode}\n` : ''}
Du kannst deine Keramik zu unseren Öffnungszeiten abholen.
Bitte hole sie innerhalb von 6 Wochen ab. Nicht abgeholte Keramik wird danach gespendet.

Malatelier Auszeit · Feldstiege 6a · 48599 Gronau
+49 176 34255005 · atelier@keramik-auszeit.de`;

    await transporter.sendMail({
      from: `"Malatelier Auszeit" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      text,
      html,
    });

    // pickup_notified_at setzen
    const pool = getPool();
    await pool.execute(
      'UPDATE painted_orders SET pickup_notified_at = NOW() WHERE id = ?',
      [data.orderId]
    );

    console.log(`[Brenn-Notify] Abholbereit-Email gesendet an ${data.customerEmail} für ${data.referenceCode}`);
    return true;
  } catch (error: any) {
    console.error(`[Brenn-Notify] Fehler beim Senden:`, error.message);
    return false;
  }
}

// ─── Feature 8: Überfällige-Abholung-Erinnerungen ────────────────────────────

export type ReminderStep = 1 | 2;

interface PickupReminderData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  referenceCode: string;
  step: ReminderStep;
}

/**
 * Sendet eine Erinnerungs-E-Mail für überfällige Abholungen.
 *
 * step 1 — freundliche Erinnerung (nach 14 Tagen ohne Abholung)
 * step 2 — letzte Erinnerung vor Spende (nach 35 Tagen)
 *
 * Setzt reminder_1_sent_at bzw. reminder_2_sent_at auf dem Auftrag,
 * damit der Scheduler nicht täglich sendet.
 */
export async function sendPickupReminderEmail(data: PickupReminderData): Promise<boolean> {
  if (!isSmtpConfigured() || !data.customerEmail) {
    console.log(`[Brenn-Notify] Erinnerung übersprungen: ${!data.customerEmail ? 'Keine E-Mail' : 'SMTP nicht konfiguriert'}`);
    return false;
  }

  try {
    const transporter = createSmtpTransporter();
    const isLastChance = data.step === 2;

    const subject = isLastChance
      ? `Letzte Erinnerung: Deine Keramik wartet noch auf dich (${data.referenceCode})`
      : `Deine Keramik im Malatelier Auszeit wartet auf dich`;

    const urgencyColor = isLastChance ? '#C0392B' : '#A0522D';
    const urgencyLabel = isLastChance ? 'Letzte Erinnerung' : 'Erinnerung';

    const mainText = isLastChance
      ? `wir melden uns noch einmal, weil deine Keramik schon eine Weile bei uns steht und wir sie dir wirklich gern persönlich übergeben möchten.
          <br><br>
          Falls wir bis zum Ende der 6-Wochen-Frist nichts von dir hören, werden wir sie leider spenden müssen, damit sie ein neues Zuhause findet.`
      : `deine bemalte Keramik steht fertig gebrannt bei uns und wartet darauf, dass du sie abholst. Wir würden uns freuen, sie dir bald zu übergeben!`;

    const mainTextPlain = isLastChance
      ? `wir melden uns noch einmal, weil deine Keramik schon eine Weile bei uns steht und wir sie dir wirklich gern persönlich übergeben möchten.\n\nFalls wir bis zum Ende der 6-Wochen-Frist nichts von dir hören, werden wir sie leider spenden müssen, damit sie ein neues Zuhause findet.`
      : `deine bemalte Keramik steht fertig gebrannt bei uns und wartet darauf, dass du sie abholst. Wir würden uns freuen, sie dir bald zu übergeben!`;

    const bodyHtml = `
        <tr><td style="padding: 28px 40px;">
          <p style="font-size: 17px; color: #423430; margin: 0 0 16px;">Hallo ${data.customerName},</p>

          <p style="font-size: 16px; color: #423430; line-height: 1.7; margin: 0 0 24px;">
            ${mainText}
          </p>

          <!-- Auftrag-Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
            <tr><td style="background: #423430; border-radius: 12px; padding: 24px 28px; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #D4956A; letter-spacing: 2px; text-transform: uppercase;">Dein Auftrag</p>
              <p style="margin: 0 0 12px; font-size: 28px; font-weight: bold; color: #FFFFFF;">${data.referenceCode}</p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: ${urgencyColor}; color: #FFFFFF; font-size: 14px; font-weight: bold; padding: 8px 20px; border-radius: 20px; letter-spacing: 0.5px;">
                    ${urgencyLabel}
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Kontakt -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
            <tr><td style="background: #FAF7F2; border: 1px solid #E0D6CC; border-radius: 10px; padding: 20px 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #A0522D; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">So erreichst du uns</p>
              <p style="margin: 0; font-size: 15px; color: #423430; line-height: 1.8;">
                Feldstiege 6a, 48599 Gronau (Westfalen)<br>
                <a href="tel:${ATELIER.phone.replace(/\s/g, '')}" style="color: #A0522D; text-decoration: none;">${ATELIER.phone}</a><br>
                <a href="mailto:${ATELIER.email}" style="color: #A0522D; text-decoration: none;">${ATELIER.email}</a>
              </p>
            </td></tr>
          </table>

          <p style="font-size: 15px; color: #6B5D56; line-height: 1.7; margin: 0;">
            Bis bald im Atelier!
          </p>
        </td></tr>`;

    const html = emailWrapper(bodyHtml);

    const text = `Hallo ${data.customerName},

${mainTextPlain}

Auftrag: ${data.referenceCode}

So erreichst du uns:
Feldstiege 6a, 48599 Gronau (Westfalen)
${ATELIER.phone}
${ATELIER.email}

Bis bald im Atelier!

${ATELIER.name} · ${ATELIER.owner}`;

    await transporter.sendMail({
      from: `"${ATELIER.name}" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      text,
      html,
    });

    // Zeitstempel setzen, damit der Scheduler nicht täglich sendet
    const pool = getPool();
    const column = data.step === 1 ? 'reminder_1_sent_at' : 'reminder_2_sent_at';
    await pool.execute(
      `UPDATE painted_orders SET ${column} = NOW() WHERE id = ?`,
      [data.orderId]
    );

    console.log(`[Brenn-Notify] Erinnerung ${data.step} gesendet an ${data.customerEmail} für ${data.referenceCode}`);
    return true;
  } catch (error: any) {
    console.error(`[Brenn-Notify] Fehler bei Erinnerung ${data.step}:`, error.message);
    return false;
  }
}

// ─── Feature 12: Bewertungs-E-Mail nach Abholung ─────────────────────────────

interface ReviewEmailData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  referenceCode: string;
}

/**
 * Sendet eine Bewertungs-E-Mail nach erfolgreicher Abholung.
 *
 * Wird direkt im pickup.ts-Endpoint aufgerufen (fire-and-forget).
 * Setzt review_email_sent_at auf dem Auftrag als Idempotenz-Guard.
 */
export async function sendReviewRequestEmail(data: ReviewEmailData): Promise<boolean> {
  if (!isSmtpConfigured() || !data.customerEmail) {
    console.log(`[Brenn-Notify] Bewertungsmail übersprungen: ${!data.customerEmail ? 'Keine E-Mail' : 'SMTP nicht konfiguriert'}`);
    return false;
  }

  try {
    const transporter = createSmtpTransporter();

    const subject = `Wie hat dir deine Keramik gefallen? Wir freuen uns über dein Feedback`;

    const bodyHtml = `
        <tr><td style="padding: 28px 40px;">
          <p style="font-size: 17px; color: #423430; margin: 0 0 16px;">Hallo ${data.customerName},</p>

          <p style="font-size: 16px; color: #423430; line-height: 1.7; margin: 0 0 16px;">
            schön, dass du deine Keramik heute abgeholt hast! Wir hoffen, du freust dich jeden Tag an deinem selbst bemalten Stück.
          </p>

          <p style="font-size: 16px; color: #423430; line-height: 1.7; margin: 0 0 24px;">
            Wenn du magst, würde uns eine kurze Bewertung sehr helfen, damit noch mehr Menschen den Weg zu uns finden. Das dauert nur eine Minute.
          </p>

          <!-- Bewertungs-Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
            <tr><td style="text-align: center;">
              <a href="${ATELIER.googleReviewUrl}"
                 style="display: inline-block; background: #D96C4A; color: #FFFFFF; font-size: 16px; font-weight: bold; padding: 14px 32px; border-radius: 30px; text-decoration: none; letter-spacing: 0.5px;">
                Jetzt Bewertung hinterlassen
              </a>
            </td></tr>
          </table>

          <p style="font-size: 14px; color: #9B8E88; line-height: 1.6; margin: 0 0 8px; text-align: center;">
            Oder direkt bei Google:
            <a href="${ATELIER.googleReviewUrl}" style="color: #A0522D; text-decoration: none; word-break: break-all;">${ATELIER.googleReviewUrl}</a>
          </p>

          <p style="font-size: 15px; color: #6B5D56; line-height: 1.7; margin: 24px 0 0;">
            Danke, dass du bei uns warst. Wir freuen uns, dich bald wieder im Atelier zu sehen!
          </p>
        </td></tr>`;

    const html = emailWrapper(bodyHtml);

    const text = `Hallo ${data.customerName},

schön, dass du deine Keramik heute abgeholt hast! Wir hoffen, du freust dich jeden Tag an deinem selbst bemalten Stück.

Wenn du magst, würde uns eine kurze Bewertung sehr helfen, damit noch mehr Menschen den Weg zu uns finden. Das dauert nur eine Minute:

${ATELIER.googleReviewUrl}

Danke, dass du bei uns warst. Wir freuen uns, dich bald wieder im Atelier zu sehen!

${ATELIER.name} · ${ATELIER.owner}`;

    await transporter.sendMail({
      from: `"${ATELIER.name}" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject,
      text,
      html,
    });

    // Idempotenz-Guard: review_email_sent_at setzen
    const pool = getPool();
    await pool.execute(
      'UPDATE painted_orders SET review_email_sent_at = NOW() WHERE id = ?',
      [data.orderId]
    );

    console.log(`[Brenn-Notify] Bewertungsmail gesendet an ${data.customerEmail} für ${data.referenceCode}`);
    return true;
  } catch (error: any) {
    console.error(`[Brenn-Notify] Fehler bei Bewertungsmail:`, error.message);
    return false;
  }
}

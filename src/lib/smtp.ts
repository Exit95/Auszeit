/**
 * Zentraler SMTP-Transporter
 * Konfigurierbare TLS-Einstellungen über Umgebungsvariable ALLOW_INSECURE_SMTP_TLS
 */

import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SERVERNAME } from './env';

/**
 * Erstellt einen konfigurierten SMTP-Transporter.
 * TLS rejectUnauthorized ist standardmäßig true (sicher).
 *
 * Wenn SMTP_HOST eine interne IP ist (z.B. 10.1.0.80), kann SMTP_SERVERNAME auf
 * den Hostnamen des Zertifikats gesetzt werden (z.B. mail.danapfel-digital.de).
 * Dadurch bleibt die Zert-Prüfung strikt, ohne auf DNS/Hairpin angewiesen zu sein.
 *
 * ALLOW_INSECURE_SMTP_TLS=true bleibt als Notausgang bestehen.
 */
export function createSmtpTransporter() {
  const allowInsecureTls = process.env.ALLOW_INSECURE_SMTP_TLS === 'true';

  const tls = allowInsecureTls
    ? { rejectUnauthorized: false }
    : SMTP_SERVERNAME
      ? { servername: SMTP_SERVERNAME }
      : undefined;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls,
  });
}


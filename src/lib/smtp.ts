/**
 * Zentraler SMTP-Transporter
 * Konfigurierbare TLS-Einstellungen über Umgebungsvariable ALLOW_INSECURE_SMTP_TLS
 */

import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } from './env';

/**
 * Erstellt einen konfigurierten SMTP-Transporter.
 * TLS rejectUnauthorized ist standardmäßig true (sicher).
 * Nur wenn ALLOW_INSECURE_SMTP_TLS=true gesetzt ist, wird rejectUnauthorized: false verwendet.
 */
export function createSmtpTransporter() {
  const allowInsecureTls = process.env.ALLOW_INSECURE_SMTP_TLS === 'true';

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_PORT === '465',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: allowInsecureTls
      ? { rejectUnauthorized: false }
      : undefined,
  });
}


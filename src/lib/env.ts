// Hilfsfunktion um Umgebungsvariablen sowohl von import.meta.env als auch process.env zu lesen
// Dies ist notwendig, da import.meta.env nur zur Build-Zeit verfügbar ist,
// während Docker-Umgebungsvariablen über process.env kommen

export function getEnv(key: string, defaultValue: string = ''): string {
  // @ts-ignore - import.meta.env existiert in Astro
  const metaEnvValue = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : undefined;
  const processEnvValue = typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
  
  return metaEnvValue || processEnvValue || defaultValue;
}

// SMTP-Konfiguration
export const SMTP_HOST = getEnv('SMTP_HOST');
export const SMTP_PORT = getEnv('SMTP_PORT', '587');
export const SMTP_USER = getEnv('SMTP_USER');
export const SMTP_PASS = getEnv('SMTP_PASS');

// E-Mail-Adressen
export const BOOKING_EMAIL = getEnv('BOOKING_EMAIL', 'info@keramik-auszeit.de');
export const FROM_EMAIL = getEnv('FROM_EMAIL', 'info@keramik-auszeit.de');

// Admin - als Funktion, damit es zur Laufzeit ausgewertet wird
export function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD || '';
  return password;
}
// Für Rückwärtskompatibilität
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// SMTP ist konfiguriert wenn Host, User und Passwort gesetzt sind
export const isSmtpConfigured = (): boolean => {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
};

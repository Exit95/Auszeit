/**
 * Server-side Input Sanitization Utilities
 * Provides protection against XSS, Path Traversal, and Injection attacks
 */

import sanitizeHtml from 'sanitize-html';
import validator from 'validator';

// ============ XSS Protection ============

/**
 * Sanitize HTML content - removes all HTML tags by default
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

/**
 * Sanitize HTML but allow basic formatting
 */
export function sanitizeRichText(input: string | undefined | null): string {
  if (!input) return '';
  return sanitizeHtml(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
    allowedAttributes: {},
  }).trim();
}

/**
 * Escape HTML entities (for display purposes)
 */
export function escapeHtml(input: string | undefined | null): string {
  if (!input) return '';
  return validator.escape(input);
}

// ============ Path Traversal Protection ============

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string | undefined | null): string {
  if (!filename) return '';
  
  // Remove path components
  let safe = filename
    .replace(/\.\./g, '') // Remove ..
    .replace(/[\/\\]/g, '') // Remove slashes
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[<>:"|?*]/g, '') // Remove Windows-forbidden chars
    .trim();
  
  // Ensure it doesn't start with a dot (hidden files)
  while (safe.startsWith('.')) {
    safe = safe.slice(1);
  }
  
  // Limit length
  if (safe.length > 255) {
    const ext = safe.slice(safe.lastIndexOf('.'));
    safe = safe.slice(0, 255 - ext.length) + ext;
  }
  
  return safe || 'unnamed';
}

/**
 * Validate that a path doesn't contain traversal attempts
 */
export function isPathSafe(filepath: string): boolean {
  if (!filepath) return false;
  
  // Check for traversal patterns
  const dangerous = [
    '..',
    '~',
    '\0',
    '%2e%2e',
    '%252e%252e',
    '....\\',
    '..../',
  ];
  
  const lower = filepath.toLowerCase();
  return !dangerous.some(pattern => lower.includes(pattern));
}

// ============ Input Validation ============

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return validator.isEmail(trimmed) ? validator.normalizeEmail(trimmed) || trimmed : null;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone) return '';
  // Remove everything except digits, +, -, spaces, and parentheses
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string | number | undefined | null, min = 0, max = Infinity): number {
  if (input === null || input === undefined) return min;
  const num = typeof input === 'number' ? input : parseInt(String(input), 10);
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

/**
 * Sanitize ID (alphanumeric + dashes only)
 */
export function sanitizeId(id: string | undefined | null): string {
  if (!id) return '';
  return id.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 100);
}

/**
 * Sanitize date string (YYYY-MM-DD format)
 */
export function sanitizeDate(date: string | undefined | null): string | null {
  if (!date) return null;
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const d = new Date(`${year}-${month}-${day}`);
  return isNaN(d.getTime()) ? null : `${year}-${month}-${day}`;
}

/**
 * Sanitize time string (HH:MM format)
 */
export function sanitizeTime(time: string | undefined | null): string | null {
  if (!time) return null;
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, hours, minutes] = match;
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${hours}:${minutes}`;
}

// ============ JSON/NoSQL Injection Protection ============

/**
 * Sanitize object keys to prevent NoSQL injection
 */
export function sanitizeObjectKeys<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Remove keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) continue;
    // Remove keys with dots (nested property access)
    if (key.includes('.')) continue;
    result[key] = value;
  }
  return result as T;
}


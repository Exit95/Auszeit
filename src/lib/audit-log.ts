/**
 * Audit Logging Module
 * Logs security-relevant events
 */

import fs from 'fs';
import path from 'path';
import { isS3Configured, readJsonFromS3, writeJsonToS3 } from './s3-storage';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: 'info' | 'warning' | 'critical';
  username?: string;
  ipAddress: string;
  userAgent: string;
  resource: string;
  action: string;
  details?: Record<string, any>;
  success: boolean;
}

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'CSRF_FAILURE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'ADMIN_ACTION'
  | 'DATA_MODIFIED'
  | 'DATA_DELETED'
  | 'FILE_UPLOADED'
  | 'FILE_DELETED'
  | 'UNAUTHORIZED_ACCESS'
  | 'SUSPICIOUS_ACTIVITY';

const AUDIT_LOG_FILE = path.join(process.cwd(), 'data', 'audit-log.json');
const AUDIT_LOG_FILENAME = 'audit-log.json';

// Maximum entries to keep (circular buffer)
const MAX_ENTRIES = 10000;

/**
 * Read audit log
 */
async function getAuditLog(): Promise<AuditLogEntry[]> {
  if (isS3Configured()) {
    return await readJsonFromS3<AuditLogEntry[]>(AUDIT_LOG_FILENAME, []);
  }

  const dataDir = path.dirname(AUDIT_LOG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    return [];
  }

  try {
    return JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Save audit log
 */
async function saveAuditLog(entries: AuditLogEntry[]): Promise<void> {
  // Keep only the most recent entries
  const trimmedEntries = entries.slice(-MAX_ENTRIES);

  if (isS3Configured()) {
    await writeJsonToS3(AUDIT_LOG_FILENAME, trimmedEntries);
    return;
  }

  const dataDir = path.dirname(AUDIT_LOG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(trimmedEntries, null, 2));
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  request: Request,
  details: {
    username?: string;
    resource: string;
    action: string;
    success: boolean;
    extra?: Record<string, any>;
  }
): Promise<void> {
  try {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      eventType,
      severity: getSeverity(eventType, details.success),
      username: details.username,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      resource: details.resource,
      action: details.action,
      details: details.extra,
      success: details.success,
    };

    const log = await getAuditLog();
    log.push(entry);
    await saveAuditLog(log);

    // Also log to console for immediate visibility
    const logMethod = entry.severity === 'critical' ? console.error :
                      entry.severity === 'warning' ? console.warn :
                      console.log;
    logMethod(`[AUDIT] ${entry.eventType}: ${entry.action} by ${entry.username || 'anonymous'} from ${entry.ipAddress}`);

  } catch (error) {
    console.error('[AUDIT] Failed to log event:', error);
  }
}

/**
 * Determine severity based on event type
 */
function getSeverity(eventType: AuditEventType, success: boolean): 'info' | 'warning' | 'critical' {
  if (!success && ['LOGIN_FAILURE', 'CSRF_FAILURE', 'UNAUTHORIZED_ACCESS'].includes(eventType)) {
    return 'warning';
  }
  if (eventType === 'SUSPICIOUS_ACTIVITY' || eventType === 'RATE_LIMIT_EXCEEDED') {
    return 'critical';
  }
  if (['DATA_DELETED', 'FILE_DELETED'].includes(eventType)) {
    return 'warning';
  }
  return 'info';
}

/**
 * Get client IP from request
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Query audit log with filters
 */
export async function queryAuditLog(filters: {
  startDate?: Date;
  endDate?: Date;
  eventType?: AuditEventType;
  username?: string;
  severity?: 'info' | 'warning' | 'critical';
  limit?: number;
}): Promise<AuditLogEntry[]> {
  let entries = await getAuditLog();

  if (filters.startDate) {
    entries = entries.filter(e => new Date(e.timestamp) >= filters.startDate!);
  }
  if (filters.endDate) {
    entries = entries.filter(e => new Date(e.timestamp) <= filters.endDate!);
  }
  if (filters.eventType) {
    entries = entries.filter(e => e.eventType === filters.eventType);
  }
  if (filters.username) {
    entries = entries.filter(e => e.username === filters.username);
  }
  if (filters.severity) {
    entries = entries.filter(e => e.severity === filters.severity);
  }

  // Sort by timestamp descending (newest first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters.limit) {
    entries = entries.slice(0, filters.limit);
  }

  return entries;
}


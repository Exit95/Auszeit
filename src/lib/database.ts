/**
 * Datenbank-Verbindungsmodul für MariaDB/MySQL.
 *
 * Liest Konfiguration aus Umgebungsvariablen (.env).
 * Stellt einen Connection-Pool bereit und prüft ob DB aktiviert ist.
 *
 * Umgebungsvariablen:
 *   DB_HOST        – Standard: 127.0.0.1
 *   DB_PORT        – Standard: 3306
 *   DB_NAME        – Standard: auszeit_prod
 *   DB_USER        – Standard: auszeit_user
 *   DB_PASSWORD    – erforderlich wenn DB_ENABLED=true
 *   DB_ENABLED     – "true" um DB-Betrieb zu aktivieren (Standard: false)
 *   DUAL_WRITE     – "true" um Dual-Write zu aktivieren (Standard: false)
 *   JSON_FALLBACK  – "true" um JSON-Fallback aktiv zu halten (Standard: true)
 */

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// ─── Konfiguration ───────────────────────────────────────────────────────────

function env(key: string, fallback: string = ''): string {
  return process.env[key] || (import.meta as any)?.env?.[key] || fallback;
}

export function isDbEnabled(): boolean {
  return env('DB_ENABLED', 'false').toLowerCase() === 'true';
}

export function isDualWriteEnabled(): boolean {
  return env('DUAL_WRITE', 'false').toLowerCase() === 'true';
}

export function isJsonFallbackEnabled(): boolean {
  return env('JSON_FALLBACK', 'true').toLowerCase() === 'true';
}

// ─── Connection Pool (lazy) ──────────────────────────────────────────────────

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const host = env('DB_HOST', '127.0.0.1');
    const port = parseInt(env('DB_PORT', '3306'), 10);
    const database = env('DB_NAME', 'auszeit_prod');
    const user = env('DB_USER', 'auszeit_user');
    const password = env('DB_PASSWORD', '');

    console.log('[DB] Erstelle Connection-Pool:', { host, port, database, user: user || 'NICHT_GESETZT' });

    _pool = mysql.createPool({
      host,
      port,
      database,
      user,
      password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+00:00',
      // Für JSON-Spalten als Objekte
      typeCast: function (field: any, next: any) {
        if (field.type === 'JSON') {
          const val = field.string();
          if (val === null) return null;
          try { return JSON.parse(val); } catch { return val; }
        }
        return next();
      },
    });
  }
  return _pool;
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Führt eine Abfrage aus und gibt Zeilen zurück. */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params?: any[]
): Promise<T> {
  const pool = getPool();
  const [rows] = await pool.execute<T>(sql, params);
  return rows;
}

/** Führt ein INSERT/UPDATE/DELETE aus und gibt ResultSetHeader zurück. */
export async function execute(
  sql: string,
  params?: any[]
): Promise<ResultSetHeader> {
  const pool = getPool();
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

/** Holt eine Verbindung für manuelle Transaktionen. */
export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

/** Führt Callback in einer Transaktion aus. Rollback bei Fehler. */
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/** Testet die Datenbankverbindung. */
export async function testConnection(): Promise<boolean> {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT 1 AS ok');
    console.log('[DB] Verbindung erfolgreich.');
    return true;
  } catch (error) {
    console.error('[DB] Verbindungsfehler:', error);
    return false;
  }
}

/** Pool sauber schließen (für Shutdown). */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    console.log('[DB] Connection-Pool geschlossen.');
  }
}


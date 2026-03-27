/**
 * Referenz-ID-Generierung für Aufträge
 * Format: #1, #2, #3 ... (einfach fortlaufend)
 */

import type { Pool } from 'mysql2/promise';

export async function generateReferenceCode(pool: Pool, _visitDate: string | Date): Promise<string> {
  const [rows] = await pool.execute<any[]>(
    `SELECT MAX(CAST(REPLACE(reference_code, '#', '') AS UNSIGNED)) as max_num FROM painted_orders`
  );

  const nextNum = (rows[0]?.max_num || 0) + 1;
  return `#${nextNum}`;
}

/**
 * Referenz-ID-Generierung für Aufträge
 * Format: AUZ-JJMMTT-NNN
 */

import type { Pool } from 'mysql2/promise';

export async function generateReferenceCode(pool: Pool, visitDate: string | Date): Promise<string> {
  const d = new Date(visitDate);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = `AUZ-${yy}${mm}${dd}-`;

  const [rows] = await pool.execute<any[]>(
    `SELECT reference_code FROM painted_orders
     WHERE reference_code LIKE ? ORDER BY reference_code DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows.length > 0) {
    const lastNum = parseInt(rows[0].reference_code.split('-')[2], 10);
    nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

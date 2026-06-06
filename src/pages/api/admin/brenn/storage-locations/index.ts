import type { APIRoute } from 'astro';
import { getPool } from '../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../lib/server/brenn/auth';
import { validateStorageLocation } from '../../../../../lib/server/brenn/validation';

export const GET: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM storage_locations ORDER BY sort_order, code'
    );
    return jsonSuccess(rows);
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden der Lagerorte:', err);
    return jsonError('Lagerorte konnten nicht geladen werden.', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const v = validateStorageLocation(data);
    if (!v.valid) {
      return jsonError(v.errors.map(e => e.message).join(' '), 400);
    }

    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO storage_locations (code, label, area_type, sort_order)
       VALUES (?, ?, ?, ?)`,
      [data.code.trim(), data.label.trim(), data.area_type, data.sort_order || 0]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute('SELECT * FROM storage_locations WHERE id = ?', [insertId]);
    return jsonSuccess((rows as any[])[0], 201);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return jsonError('Ein Lagerort mit diesem Code existiert bereits.', 400);
    }
    console.error('[Brenn] Fehler beim Erstellen des Lagerorts:', err);
    return jsonError('Lagerort konnte nicht erstellt werden.', 500);
  }
};

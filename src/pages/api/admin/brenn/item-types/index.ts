import type { APIRoute } from 'astro';
import { getPool } from '../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../lib/server/brenn/auth';
import { validateItemType } from '../../../../../lib/server/brenn/validation';

export const GET: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM item_types ORDER BY sort_order, name');
    return jsonSuccess(rows);
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden der Werkstücktypen:', err);
    return jsonError('Werkstücktypen konnten nicht geladen werden.', 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const v = validateItemType(data);
    if (!v.valid) {
      return jsonError(v.errors.map(e => e.message).join(' '), 400);
    }

    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO item_types (name, sort_order) VALUES (?, ?)',
      [data.name.trim(), data.sort_order || 0]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute('SELECT * FROM item_types WHERE id = ?', [insertId]);
    return jsonSuccess((rows as any[])[0], 201);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return jsonError('Ein Werkstücktyp mit diesem Namen existiert bereits.', 400);
    }
    console.error('[Brenn] Fehler beim Erstellen des Werkstücktyps:', err);
    return jsonError('Werkstücktyp konnte nicht erstellt werden.', 500);
  }
};

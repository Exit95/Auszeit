import type { APIRoute } from 'astro';
import { getPool } from '../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../lib/server/brenn/auth';

export const GET: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM item_types WHERE id = ?', [params.id]);
    const arr = rows as any[];
    if (arr.length === 0) return jsonError('Werkstücktyp nicht gefunden.', 404);
    return jsonSuccess(arr[0]);
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden des Werkstücktyps:', err);
    return jsonError('Werkstücktyp konnte nicht geladen werden.', 500);
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const pool = getPool();

    const [existing] = await pool.execute('SELECT * FROM item_types WHERE id = ?', [params.id]);
    if ((existing as any[]).length === 0) return jsonError('Werkstücktyp nicht gefunden.', 404);

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0 || data.name.trim().length > 80) {
        return jsonError('Name muss zwischen 1 und 80 Zeichen lang sein.', 400);
      }
      updates.push('name = ?');
      values.push(data.name.trim());
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(data.is_active ? 1 : 0);
    }
    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(Number(data.sort_order));
    }

    if (updates.length === 0) return jsonError('Keine Änderungen angegeben.', 400);

    values.push(params.id);
    await pool.execute(
      `UPDATE item_types SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute('SELECT * FROM item_types WHERE id = ?', [params.id]);
    return jsonSuccess((rows as any[])[0]);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return jsonError('Ein Werkstücktyp mit diesem Namen existiert bereits.', 400);
    }
    console.error('[Brenn] Fehler beim Aktualisieren des Werkstücktyps:', err);
    return jsonError('Werkstücktyp konnte nicht aktualisiert werden.', 500);
  }
};

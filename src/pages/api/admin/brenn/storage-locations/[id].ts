import type { APIRoute } from 'astro';
import { getPool } from '../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../lib/server/brenn/auth';
import { validateStorageLocation } from '../../../../../lib/server/brenn/validation';

export const GET: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM storage_locations WHERE id = ?', [params.id]);
    const arr = rows as any[];
    if (arr.length === 0) return jsonError('Lagerort nicht gefunden.', 404);
    return jsonSuccess(arr[0]);
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden des Lagerorts:', err);
    return jsonError('Lagerort konnte nicht geladen werden.', 500);
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const pool = getPool();

    // Prüfen ob Lagerort existiert
    const [existing] = await pool.execute('SELECT * FROM storage_locations WHERE id = ?', [params.id]);
    if ((existing as any[]).length === 0) return jsonError('Lagerort nicht gefunden.', 404);

    const updates: string[] = [];
    const values: any[] = [];

    if (data.code !== undefined) {
      if (!data.code || data.code.trim().length === 0 || data.code.trim().length > 20) {
        return jsonError('Code muss zwischen 1 und 20 Zeichen lang sein.', 400);
      }
      updates.push('code = ?');
      values.push(data.code.trim());
    }
    if (data.label !== undefined) {
      if (!data.label || data.label.trim().length === 0 || data.label.trim().length > 100) {
        return jsonError('Bezeichnung muss zwischen 1 und 100 Zeichen lang sein.', 400);
      }
      updates.push('label = ?');
      values.push(data.label.trim());
    }
    if (data.area_type !== undefined) {
      const validTypes = ['PRE', 'KILN', 'POST', 'PICKUP', 'HOLD'];
      if (!validTypes.includes(data.area_type)) {
        return jsonError('Ungültiger Bereichstyp.', 400);
      }
      updates.push('area_type = ?');
      values.push(data.area_type);
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
      `UPDATE storage_locations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute('SELECT * FROM storage_locations WHERE id = ?', [params.id]);
    return jsonSuccess((rows as any[])[0]);
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return jsonError('Ein Lagerort mit diesem Code existiert bereits.', 400);
    }
    console.error('[Brenn] Fehler beim Aktualisieren des Lagerorts:', err);
    return jsonError('Lagerort konnte nicht aktualisiert werden.', 500);
  }
};

import type { APIRoute } from 'astro';
import { getPool } from '../../../../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../../../../lib/server/brenn/auth';

export const PATCH: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const pool = getPool();

    const [rows] = await pool.execute(
      'SELECT * FROM painted_order_items WHERE id = ? AND painted_order_id = ?',
      [params.itemId, params.id]
    );
    if ((rows as any[]).length === 0) return jsonError('Werkstück nicht gefunden.', 404);

    const updates: string[] = [];
    const values: any[] = [];

    if (data.item_type !== undefined) {
      if (!data.item_type || data.item_type.trim().length === 0) {
        return jsonError('Werkstücktyp ist erforderlich.', 400);
      }
      updates.push('item_type = ?');
      values.push(data.item_type.trim());
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description?.trim() || null);
    }
    if (data.quantity !== undefined) {
      const qty = Number(data.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return jsonError('Ungültige Anzahl.', 400);
      }
      updates.push('quantity = ?');
      values.push(qty);
    }
    if (data.storage_location_id !== undefined) {
      if (data.storage_location_id !== null) {
        const [slRows] = await pool.execute(
          'SELECT id FROM storage_locations WHERE id = ? AND is_active = 1',
          [data.storage_location_id]
        );
        if ((slRows as any[]).length === 0) return jsonError('Ungültiger Lagerort.', 400);
      }
      updates.push('storage_location_id = ?');
      values.push(data.storage_location_id);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes?.trim() || null);
    }

    if (updates.length === 0) return jsonError('Keine Änderungen angegeben.', 400);

    values.push(params.itemId);
    await pool.execute(
      `UPDATE painted_order_items SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [updated] = await pool.execute('SELECT * FROM painted_order_items WHERE id = ?', [params.itemId]);
    return jsonSuccess((updated as any[])[0]);
  } catch (err) {
    console.error('[Brenn] Fehler beim Aktualisieren des Werkstücks:', err);
    return jsonError('Werkstück konnte nicht aktualisiert werden.', 500);
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM painted_order_items WHERE id = ? AND painted_order_id = ?',
      [params.itemId, params.id]
    );
    const item = (rows as any[])[0];
    if (!item) return jsonError('Werkstück nicht gefunden.', 404);

    if (item.status !== 'ERFASST') {
      return jsonError('Nur Werkstücke im Status "Erfasst" können entfernt werden.', 400);
    }

    // Prüfen ob noch andere Items existieren
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as c FROM painted_order_items WHERE painted_order_id = ? AND id != ?',
      [params.id, params.itemId]
    );
    if ((countResult as any[])[0].c === 0) {
      return jsonError('Der letzte Werkstückeintrag kann nicht gelöscht werden. Löschen Sie stattdessen den gesamten Auftrag.', 400);
    }

    await pool.execute('DELETE FROM painted_order_items WHERE id = ?', [params.itemId]);
    return jsonSuccess({ deleted: true });
  } catch (err) {
    console.error('[Brenn] Fehler beim Löschen des Werkstücks:', err);
    return jsonError('Werkstück konnte nicht gelöscht werden.', 500);
  }
};

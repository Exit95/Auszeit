import type { APIRoute } from 'astro';
import { getPool } from '../../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../../lib/server/brenn/auth';
import { validateCustomer } from '../../../../../lib/server/brenn/validation';

export const GET: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [params.id]);
    const arr = rows as any[];
    if (arr.length === 0) return jsonError('Kunde nicht gefunden.', 404);

    // Auftragshistorie laden
    const [orders] = await pool.execute(
      `SELECT po.*, sl.code as storage_code, sl.label as storage_label
       FROM painted_orders po
       LEFT JOIN storage_locations sl ON po.storage_location_id = sl.id
       WHERE po.customer_id = ?
       ORDER BY po.visit_date DESC`,
      [params.id]
    );

    return jsonSuccess({ customer: arr[0], orders });
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden des Kunden:', err);
    return jsonError('Kunde konnte nicht geladen werden.', 500);
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const data = await request.json();
    const pool = getPool();

    const [existing] = await pool.execute('SELECT * FROM customers WHERE id = ?', [params.id]);
    if ((existing as any[]).length === 0) return jsonError('Kunde nicht gefunden.', 404);

    // Merge mit bestehenden Daten für Validierung
    const current = (existing as any[])[0];
    const merged = {
      first_name: data.first_name !== undefined ? data.first_name : current.first_name,
      last_name: data.last_name !== undefined ? data.last_name : current.last_name,
      email: data.email !== undefined ? data.email : current.email,
      phone: data.phone !== undefined ? data.phone : current.phone,
    };

    const v = validateCustomer(merged);
    if (!v.valid) {
      return jsonError(v.errors.map(e => e.message).join(' '), 400);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.first_name !== undefined) { updates.push('first_name = ?'); values.push(data.first_name.trim()); }
    if (data.last_name !== undefined) { updates.push('last_name = ?'); values.push(data.last_name.trim()); }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email?.trim() || null); }
    if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone?.trim() || null); }
    if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes?.trim() || null); }

    if (updates.length === 0) return jsonError('Keine Änderungen angegeben.', 400);

    values.push(params.id);
    await pool.execute(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [params.id]);
    return jsonSuccess((rows as any[])[0]);
  } catch (err) {
    console.error('[Brenn] Fehler beim Aktualisieren des Kunden:', err);
    return jsonError('Kunde konnte nicht aktualisiert werden.', 500);
  }
};

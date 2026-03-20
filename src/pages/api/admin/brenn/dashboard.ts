import type { APIRoute } from 'astro';
import { getPool } from '../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../lib/server/brenn/auth';

export const GET: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();
    const today = new Date().toISOString().split('T')[0];

    // Alle Zähler in parallelen Queries
    const [
      [wartetRows],
      [ofenRows],
      [abholbereitRows],
      [ueberfaelligRows],
      [heuteAbgeholtRows],
      [erfasstOhneLagerRows],
      [problemeRows]
    ] = await Promise.all([
      pool.execute(
        "SELECT COUNT(*) as c FROM painted_orders WHERE overall_status = 'WARTET_AUF_BRENNEN'"
      ),
      pool.execute(
        "SELECT COUNT(*) as c FROM painted_orders WHERE overall_status = 'IM_BRENNOFEN'"
      ),
      pool.execute(
        "SELECT COUNT(*) as c FROM painted_orders WHERE overall_status = 'ABHOLBEREIT'"
      ),
      pool.execute(
        `SELECT COUNT(*) as c FROM painted_orders
         WHERE overall_status = 'ABHOLBEREIT'
         AND pickup_notified_at IS NOT NULL
         AND pickup_notified_at < DATE_SUB(NOW(), INTERVAL 14 DAY)`
      ),
      pool.execute(
        `SELECT COUNT(*) as c FROM painted_orders
         WHERE overall_status = 'ABGEHOLT'
         AND DATE(updated_at) = ?`,
        [today]
      ),
      pool.execute(
        `SELECT COUNT(*) as c FROM painted_orders
         WHERE overall_status = 'ERFASST'
         AND storage_location_id IS NULL`
      ),
      pool.execute(
        "SELECT COUNT(*) as c FROM painted_orders WHERE overall_status = 'PROBLEM'"
      ),
    ]);

    // Nächste Schritte: Aufträge die Aktion brauchen
    const [nextStepsRows] = await pool.execute(
      `SELECT po.id, po.reference_code, po.overall_status, po.visit_date,
        c.first_name, c.last_name,
        sl.code as storage_code
       FROM painted_orders po
       JOIN customers c ON po.customer_id = c.id
       LEFT JOIN storage_locations sl ON po.storage_location_id = sl.id
       WHERE (po.overall_status = 'ERFASST' AND po.storage_location_id IS NULL)
          OR po.overall_status = 'GEBRANNT'
       ORDER BY po.visit_date ASC
       LIMIT 10`
    );

    // Abholbereit-Liste
    const [abholbereitListRows] = await pool.execute(
      `SELECT po.id, po.reference_code, po.visit_date, po.pickup_notified_at,
        c.first_name, c.last_name,
        sl.code as storage_code,
        (SELECT GROUP_CONCAT(CONCAT(poi.quantity, '× ', poi.item_type) SEPARATOR ', ')
         FROM painted_order_items poi WHERE poi.painted_order_id = po.id) as items_summary
       FROM painted_orders po
       JOIN customers c ON po.customer_id = c.id
       LEFT JOIN storage_locations sl ON po.storage_location_id = sl.id
       WHERE po.overall_status = 'ABHOLBEREIT'
       ORDER BY po.visit_date ASC
       LIMIT 20`
    );

    return jsonSuccess({
      counters: {
        wartet_auf_brennen: (wartetRows as any[])[0].c,
        im_brennofen: (ofenRows as any[])[0].c,
        abholbereit: (abholbereitRows as any[])[0].c,
        ueberfaellig: (ueberfaelligRows as any[])[0].c,
        heute_abgeholt: (heuteAbgeholtRows as any[])[0].c,
        erfasst_ohne_lagerort: (erfasstOhneLagerRows as any[])[0].c,
        probleme: (problemeRows as any[])[0].c,
      },
      next_steps: nextStepsRows,
      abholbereit_list: abholbereitListRows
    });
  } catch (err) {
    console.error('[Brenn] Fehler beim Laden des Dashboards:', err);
    return jsonError('Dashboard konnte nicht geladen werden.', 500);
  }
};

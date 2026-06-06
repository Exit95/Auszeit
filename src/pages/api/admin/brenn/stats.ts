import type { APIRoute } from 'astro';
import { getPool } from '../../../../lib/database';
import { requireAuth, jsonSuccess, jsonError } from '../../../../lib/server/brenn/auth';

export const GET: APIRoute = async ({ request }) => {
  const authErr = requireAuth(request);
  if (authErr) return authErr;

  try {
    const pool = getPool();

    const [
      [monthlyRows],
      [itemTypeRows],
      [customerGrowthRows],
      [pickupRows],
      [totalsRows],
    ] = await Promise.all([
      // Aufträge pro Monat (letzte 12 Monate)
      pool.execute(`
        SELECT DATE_FORMAT(visit_date, '%Y-%m') as monat,
               COUNT(*) as anzahl
        FROM painted_orders
        WHERE visit_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(visit_date, '%Y-%m')
        ORDER BY monat ASC
      `),

      // Beliebteste Keramik-Typen
      pool.execute(`
        SELECT item_type as typ,
               SUM(quantity) as anzahl
        FROM painted_order_items
        GROUP BY item_type
        ORDER BY anzahl DESC
        LIMIT 10
      `),

      // Kunden-Wachstum pro Monat (letzte 12 Monate)
      pool.execute(`
        SELECT DATE_FORMAT(created_at, '%Y-%m') as monat,
               COUNT(*) as neue_kunden
        FROM customers
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY monat ASC
      `),

      // Abholquote
      pool.execute(`
        SELECT
          COUNT(CASE WHEN overall_status = 'ABGEHOLT' THEN 1 END) as abgeholt,
          COUNT(CASE WHEN overall_status = 'ABHOLBEREIT' THEN 1 END) as wartet,
          COUNT(CASE WHEN overall_status NOT IN ('ERFASST', 'STORNIERT') THEN 1 END) as gesamt_bearbeitet
        FROM painted_orders
      `),

      // Gesamtzahlen
      pool.execute(`
        SELECT
          (SELECT COUNT(*) FROM customers) as kunden_gesamt,
          (SELECT COUNT(*) FROM painted_orders) as auftraege_gesamt,
          (SELECT COUNT(*) FROM painted_order_items) as werkstuecke_gesamt,
          (SELECT COUNT(*) FROM bookings WHERE booking_status = 'confirmed') as buchungen_gesamt
      `),
    ]);

    const totals = (totalsRows as any[])[0];
    const pickup = (pickupRows as any[])[0];

    return jsonSuccess({
      auftraege_pro_monat: monthlyRows,
      beliebte_typen: itemTypeRows,
      kunden_wachstum: customerGrowthRows,
      abholquote: {
        abgeholt: pickup.abgeholt,
        wartet_auf_abholung: pickup.wartet,
        gesamt_bearbeitet: pickup.gesamt_bearbeitet,
        quote_prozent: pickup.gesamt_bearbeitet > 0
          ? Math.round((pickup.abgeholt / pickup.gesamt_bearbeitet) * 100)
          : 0,
      },
      gesamt: {
        kunden: totals.kunden_gesamt,
        auftraege: totals.auftraege_gesamt,
        werkstuecke: totals.werkstuecke_gesamt,
        buchungen: totals.buchungen_gesamt,
      },
    });
  } catch (err) {
    console.error('[Brenn] Statistiken Fehler:', err);
    return jsonError('Statistiken konnten nicht geladen werden.', 500);
  }
};

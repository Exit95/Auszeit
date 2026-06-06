/**
 * Synchronisiert bestätigte Buchungen mit der Brenn-Verwaltung.
 * Erstellt Kunden und Aufträge aus Buchungsdaten.
 * Wird nur aufgerufen wenn eine Buchung vom Admin bestätigt wird.
 */

import { isDbEnabled, getPool } from '../../database';
import { generateReferenceCode } from './reference';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

interface BookingData {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  participants: number;
  participantNames?: string[];
  date?: string;
}

/**
 * Erstellt Kunden und Aufträge aus einer bestätigten Buchung.
 * Wird aufgerufen wenn participantNames vorhanden sind.
 * Fallback: Buchungsname wird als einzelner Kunde angelegt.
 */
export async function syncBookingToBrenn(booking: BookingData): Promise<{
  synced: boolean;
  customersCreated: number;
  ordersCreated: number;
  reason?: string;
}> {
  if (!isDbEnabled()) {
    return { synced: false, customersCreated: 0, ordersCreated: 0, reason: 'DB nicht aktiviert' };
  }

  const names = booking.participantNames || [];

  // Wenn keine Teilnehmernamen, nutze den Buchungsnamen
  if (names.length === 0) {
    if (booking.name) {
      names.push(booking.name);
    } else {
      return { synced: false, customersCreated: 0, ordersCreated: 0, reason: 'Keine Namen vorhanden' };
    }
  }

  const pool = getPool();
  const visitDate = booking.date || new Date().toISOString().split('T')[0];

  let customersCreated = 0;
  let ordersCreated = 0;

  try {
    for (const fullName of names) {
      const trimmed = fullName.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      // Kunde finden oder anlegen
      const [existing] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM customers WHERE first_name = ? AND last_name = ? LIMIT 1',
        [firstName, lastName]
      );

      let customerId: number;
      if (existing.length > 0) {
        customerId = existing[0].id;
        // Email/Phone updaten falls der Bucher die Kontaktdaten hat
        const isBooker = (trimmed === booking.name);
        if (isBooker) {
          await pool.query(
            'UPDATE customers SET email = COALESCE(NULLIF(email, \'\'), ?), phone = COALESCE(NULLIF(phone, \'\'), ?) WHERE id = ?',
            [booking.email, booking.phone || null, customerId]
          );
        }
      } else {
        const isBooker = (trimmed === booking.name);
        const [result] = await pool.query<ResultSetHeader>(
          'INSERT INTO customers (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)',
          [firstName, lastName, isBooker ? booking.email : null, isBooker ? (booking.phone || null) : null]
        );
        customerId = result.insertId;
        customersCreated++;
      }

      // Prüfen ob bereits ein Auftrag für diesen Kunden an diesem Tag existiert
      const [existingOrder] = await pool.query<RowDataPacket[]>(
        'SELECT id FROM painted_orders WHERE customer_id = ? AND visit_date = ? LIMIT 1',
        [customerId, visitDate]
      );

      if (existingOrder.length === 0) {
        const refCode = await generateReferenceCode(pool, visitDate);
        const [orderResult] = await pool.query<ResultSetHeader>(
          'INSERT INTO painted_orders (reference_code, customer_id, visit_date, overall_status, notes) VALUES (?, ?, ?, \'ERFASST\', ?)',
          [refCode, customerId, visitDate, `Buchung #${booking.id}`]
        );
        const orderId = orderResult.insertId;

        // Standard-Werkstück anlegen
        await pool.query(
          'INSERT INTO painted_order_items (painted_order_id, item_type, quantity, status) VALUES (?, \'Sonstiges\', 1, \'ERFASST\')',
          [orderId]
        );

        ordersCreated++;
      }
    }

    console.log(`[Brenn-Sync] Buchung #${booking.id}: ${customersCreated} Kunden, ${ordersCreated} Aufträge erstellt`);
    return { synced: true, customersCreated, ordersCreated };
  } catch (error: any) {
    console.error('[Brenn-Sync] Fehler:', error.message);
    return { synced: false, customersCreated, ordersCreated, reason: error.message };
  }
}

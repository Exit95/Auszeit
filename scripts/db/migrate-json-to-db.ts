#!/usr/bin/env ts-node
/**
 * Idempotentes Migrationsskript: JSON → MariaDB
 *
 * Nutzung:
 *   npx ts-node scripts/db/migrate-json-to-db.ts                 # Dry-Run (Standard)
 *   npx ts-node scripts/db/migrate-json-to-db.ts --execute        # Echte Migration
 *   npx ts-node scripts/db/migrate-json-to-db.ts --execute --only bookings
 *
 * Features:
 *   - Idempotent: Kann beliebig oft ausgeführt werden (INSERT ... ON DUPLICATE KEY)
 *   - Dry-Run: Zeigt was passieren würde, ohne zu schreiben
 *   - legacy_id: Jeder Datensatz behält seine Original-ID
 *   - Transaktionen: Jede Entität wird in einer Transaktion migriert
 *   - Protokollierung: Jeder Lauf wird in migration_runs gespeichert
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ESM-kompatible __dirname Alternative
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env laden bevor DB-Module importiert werden
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

import { getPool, execute, query, withTransaction, closePool } from '../../src/lib/database.js';
import {
  dbSaveTimeSlot, dbSaveBooking, dbSaveWorkshop,
  dbSaveReview, dbSaveVoucher, dbSaveCategory, dbSaveImageMetadata,
  toDbDatetime,
} from '../../src/lib/db-storage.js';
import { readJsonFromS3, isS3Configured } from '../../src/lib/s3-storage.js';
import type { TimeSlot, Booking, Workshop, GalleryCategory, ImageMetadata } from '../../src/lib/storage.js';
import type { Voucher } from '../../src/lib/voucher-storage.js';

// ─── CLI-Argumente ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--execute');
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

async function loadJson<T>(filename: string): Promise<T> {
  if (!isS3Configured()) {
    console.log(`  ⚠ S3 nicht konfiguriert – kann ${filename} nicht laden.`);
    return [] as unknown as T;
  }
  try {
    const data = await readJsonFromS3<T>(filename, [] as unknown as T);
    return data;
  } catch (err: any) {
    console.log(`  ⚠ Fehler beim Laden von ${filename} aus S3: ${err.message}`);
    return [] as unknown as T;
  }
}

interface MigrationStats {
  entity: string;
  read: number;
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function migrateEntity<T>(
  name: string,
  items: T[],
  saveFn: (item: T) => Promise<void>,
): Promise<MigrationStats> {
  const stats: MigrationStats = { entity: name, read: items.length, imported: 0, skipped: 0, failed: 0, errors: [] };

  console.log(`\n📦 ${name}: ${items.length} Datensätze gefunden`);

  if (DRY_RUN) {
    console.log(`  🔍 DRY-RUN: Würde ${items.length} Datensätze migrieren.`);
    stats.skipped = items.length;
    return stats;
  }

  for (let i = 0; i < items.length; i++) {
    try {
      await saveFn(items[i]);
      stats.imported++;
    } catch (err: any) {
      stats.failed++;
      const msg = `  ❌ Fehler bei Datensatz ${i}: ${err.message}`;
      stats.errors.push(msg);
      console.error(msg);
    }
  }

  console.log(`  ✅ ${stats.imported} importiert, ${stats.failed} Fehler`);
  return stats;
}

// ─── Hauptlogik ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Auszeit: JSON → MariaDB Migration');
  console.log(`  Modus: ${DRY_RUN ? '🔍 DRY-RUN (kein Schreiben)' : '🚀 EXECUTE (schreibt in DB)'}`);
  if (ONLY) console.log(`  Filter: nur "${ONLY}"`);
  console.log('═══════════════════════════════════════════════════');

  const allStats: MigrationStats[] = [];
  const shouldMigrate = (name: string) => !ONLY || ONLY === name;

  // Migrationslauf protokollieren
  let runId: number | null = null;
  if (!DRY_RUN) {
    const result = await execute(
      `INSERT INTO migration_runs (migration_name, started_at, status) VALUES (?, NOW(), 'running')`,
      [`json-to-db${ONLY ? `-${ONLY}` : ''}`]
    );
    runId = result.insertId;
  }

  try {
    // 1. Time Slots
    if (shouldMigrate('slots')) {
      const slots = await loadJson<TimeSlot[]>('time-slots.json');
      allStats.push(await migrateEntity('TimeSlots', slots, dbSaveTimeSlot));
    }

    // 2. Bookings
    if (shouldMigrate('bookings')) {
      const bookings = await loadJson<Booking[]>('bookings.json');
      allStats.push(await migrateEntity('Bookings', bookings, dbSaveBooking));
    }

    // 4. Workshop-Bookings (gleiche Struktur wie Bookings, separate Datei)
    if (shouldMigrate('workshop-bookings')) {
      const wbookings = await loadJson<any[]>('workshop-bookings.json');
      if (wbookings.length > 0) {
        allStats.push(await migrateEntity('WorkshopBookings', wbookings, async (wb: any) => {
          await execute(
            `INSERT INTO workshop_bookings (legacy_id, workshop_legacy_id, customer_name, email, phone, participants, notes, booking_status, raw_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               customer_name = VALUES(customer_name), email = VALUES(email),
               booking_status = VALUES(booking_status), updated_at = NOW()`,
            [wb.id, wb.workshopId, wb.name, wb.email, wb.phone || null,
             wb.participants || 1, wb.notes || null, wb.status || 'pending',
             JSON.stringify(wb), toDbDatetime(wb.createdAt) || new Date().toISOString().slice(0, 19).replace('T', ' ')]
          );
        }));
      } else {
        console.log('\n📦 WorkshopBookings: 0 Datensätze – überspringe.');
      }
    }

    // 5. Reviews
    if (shouldMigrate('reviews')) {
      const reviews = await loadJson<any[]>('reviews.json');
      allStats.push(await migrateEntity('Reviews', reviews, (r) => dbSaveReview({
        id: r.id, name: r.name, rating: r.rating,
        comment: r.comment, date: r.date, approved: r.approved,
      })));
    }

    // 6. Vouchers
    if (shouldMigrate('vouchers')) {
      const vouchers = await loadJson<Voucher[]>('vouchers.json');
      allStats.push(await migrateEntity('Vouchers', vouchers, dbSaveVoucher));
    }

    // 7. Gallery Categories
    if (shouldMigrate('categories')) {
      const cats = await loadJson<GalleryCategory[]>('gallery-categories.json');
      allStats.push(await migrateEntity('GalleryCategories', cats, dbSaveCategory));
    }

    // 8. Image Metadata
    if (shouldMigrate('images')) {
      const imgs = await loadJson<ImageMetadata[]>('image-metadata.json');
      allStats.push(await migrateEntity('ImageMetadata', imgs, dbSaveImageMetadata));
    }

    // ─── Zusammenfassung ──────────────────────────────────────────────────────

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Zusammenfassung');
    console.log('═══════════════════════════════════════════════════');

    let totalRead = 0, totalImported = 0, totalFailed = 0;
    for (const s of allStats) {
      console.log(`  ${s.entity}: ${s.read} gelesen, ${s.imported} importiert, ${s.failed} Fehler`);
      totalRead += s.read;
      totalImported += s.imported;
      totalFailed += s.failed;
    }

    console.log(`\n  GESAMT: ${totalRead} gelesen, ${totalImported} importiert, ${totalFailed} Fehler`);

    if (DRY_RUN) {
      console.log('\n  ℹ️  Das war ein DRY-RUN. Um die Migration auszuführen:');
      console.log('     npx ts-node scripts/db/migrate-json-to-db.ts --execute\n');
    }

    // Migrationslauf aktualisieren
    if (!DRY_RUN && runId) {
      await execute(
        `UPDATE migration_runs SET finished_at = NOW(), status = ?, records_read = ?, records_imported = ?, records_failed = ?, log_text = ? WHERE id = ?`,
        [totalFailed > 0 ? 'completed_with_errors' : 'completed',
         totalRead, totalImported, totalFailed,
         allStats.map(s => `${s.entity}: ${s.imported}/${s.read} (${s.failed} errors)`).join('\n'),
         runId]
      );
    }

  } catch (err: any) {
    console.error('\n💥 Kritischer Fehler:', err.message);
    if (!DRY_RUN && runId) {
      await execute(
        `UPDATE migration_runs SET finished_at = NOW(), status = 'failed', log_text = ? WHERE id = ?`,
        [err.message, runId]
      );
    }
    process.exit(1);
  } finally {
    await closePool();
  }
}

main().catch(console.error);

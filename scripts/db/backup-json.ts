#!/usr/bin/env ts-node
/**
 * Backup-Skript für alle JSON-Dateien vor der DB-Migration.
 * Erstellt einen Zeitstempel-Ordner mit Kopien aller Dateien und MD5-Prüfsummen.
 *
 * Nutzung:
 *   npx ts-node scripts/db/backup-json.ts
 *   npx ts-node scripts/db/backup-json.ts --verify /pfad/zum/backup
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const SERVER_DATA_DIR = path.join(PROJECT_ROOT, 'server-data');
const BACKUPS_ROOT = path.join(PROJECT_ROOT, 'backups');

// Alle JSON-Dateien, die gesichert werden sollen
const JSON_FILES = [
  'bookings.json',
  'time-slots.json',
  'workshops.json',
  'workshop-bookings.json',
  'reviews.json',
  'gallery-categories.json',
  'image-metadata.json',
  'vouchers.json',
];

function md5(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

function backupDirectory(sourceDir: string, targetDir: string, label: string): { file: string; checksum: string }[] {
  const results: { file: string; checksum: string }[] = [];

  if (!fs.existsSync(sourceDir)) {
    console.log(`  ⚠ Verzeichnis nicht vorhanden: ${sourceDir}`);
    return results;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const filename of JSON_FILES) {
    const src = path.join(sourceDir, filename);
    if (!fs.existsSync(src)) continue;

    const dest = path.join(targetDir, filename);
    fs.copyFileSync(src, dest);
    const checksum = md5(src);
    results.push({ file: `${label}/${filename}`, checksum });
    console.log(`  ✅ ${label}/${filename}  (md5: ${checksum})`);
  }

  return results;
}

function createBackup(): void {
  const ts = timestamp();
  const backupDir = path.join(BACKUPS_ROOT, `${ts}-before-db-migration`);

  console.log(`\n🔒 Backup wird erstellt: ${backupDir}\n`);

  if (fs.existsSync(backupDir)) {
    console.log('⚠ Backup-Ordner existiert bereits. Abbruch.');
    process.exit(1);
  }

  const allChecksums: { file: string; checksum: string }[] = [];

  // data/ sichern
  const dataResults = backupDirectory(DATA_DIR, path.join(backupDir, 'data'), 'data');
  allChecksums.push(...dataResults);

  // server-data/ sichern
  const serverResults = backupDirectory(SERVER_DATA_DIR, path.join(backupDir, 'server-data'), 'server-data');
  allChecksums.push(...serverResults);

  // Prüfsummen-Datei schreiben
  const checksumFile = path.join(backupDir, 'checksums.json');
  fs.writeFileSync(checksumFile, JSON.stringify({
    createdAt: new Date().toISOString(),
    backupDir,
    files: allChecksums,
  }, null, 2));

  console.log(`\n📋 Prüfsummen gespeichert: ${checksumFile}`);
  console.log(`✅ Backup abgeschlossen: ${allChecksums.length} Dateien gesichert.\n`);
}

function verifyBackup(backupDir: string): void {
  const checksumFile = path.join(backupDir, 'checksums.json');
  if (!fs.existsSync(checksumFile)) {
    console.log('❌ Keine checksums.json im Backup-Ordner gefunden.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(checksumFile, 'utf-8'));
  let ok = 0;
  let fail = 0;

  console.log(`\n🔍 Verifiziere Backup: ${backupDir}\n`);

  for (const entry of data.files) {
    const filePath = path.join(backupDir, entry.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ FEHLT: ${entry.file}`);
      fail++;
      continue;
    }
    const actual = md5(filePath);
    if (actual === entry.checksum) {
      console.log(`  ✅ OK: ${entry.file}`);
      ok++;
    } else {
      console.log(`  ❌ CHECKSUM MISMATCH: ${entry.file} (erwartet: ${entry.checksum}, ist: ${actual})`);
      fail++;
    }
  }

  console.log(`\n📊 Ergebnis: ${ok} OK, ${fail} Fehler\n`);
  if (fail > 0) process.exit(1);
}

// CLI
const args = process.argv.slice(2);
if (args[0] === '--verify' && args[1]) {
  verifyBackup(path.resolve(args[1]));
} else {
  createBackup();
}


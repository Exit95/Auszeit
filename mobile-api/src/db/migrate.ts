import fs from 'fs';
import path from 'path';
import pool from './connection';

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      await connection.execute(statement);
      console.log('OK:', statement.substring(0, 60) + '...');
    }
    console.log('\nMigration abgeschlossen.');
  } catch (error) {
    console.error('Migration fehlgeschlagen:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();

import fs from 'fs';
import path from 'path';
import db from './db';

/* eslint-disable no-console */
export default async function runMigration073(): Promise<void> {
  try {
    console.log('🔱 ARCHON EMERGENCY MIGRATION SYSTEM');
    // In production, the file will be at this location relative to the built JS
    const migrationPath = path.join(
      process.cwd(),
      'packages/database/migrations/073_sovereign_administrative_audit_vault.sql'
    );

    if (!fs.existsSync(migrationPath)) {
      console.warn(`⚠️ Migration file not found at ${migrationPath}. Skipping.`);
      return;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    const statements = sql.split(';').filter((s) => s.trim().length > 0);

    // eslint-disable-next-line no-restricted-syntax
    for (const statement of statements) {
      // eslint-disable-next-line no-await-in-loop
      await db.execute(statement);
    }

    console.log('✅ Migration 073 executed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

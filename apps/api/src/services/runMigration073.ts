import db from './db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('🔱 ARCHON EMERGENCY MIGRATION SYSTEM');
    const migrationPath = path.join(__dirname, '../../../../packages/database/migrations/073_sovereign_administrative_audit_vault.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon but ignore inside strings if any (simple split for now)
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await db.query(statement);
    }
    
    console.log('✅ Migration 073 executed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();

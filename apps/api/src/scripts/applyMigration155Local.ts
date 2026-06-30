/* eslint-disable */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
import db from '../services/db';

async function apply() {
  const migrationPath = path.join(
    __dirname,
    '../../../../packages/database/migrations/155_cosmonaut_roles.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements (skip comments and empty lines)
  const statements: string[] = [];
  let current = '';
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || !trimmed) continue;
    current += '\n' + line;
    if (trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());

  for (const stmt of statements) {
    if (!stmt) continue;
    await (db as any).execute(stmt);
    const preview = stmt.split('\n')[0].substring(0, 80);
    console.log(`  OK  ${preview}`);
  }

  // Verify
  const [roles] = (await (db as any).execute(
    `SELECT id, name, is_system FROM cosmonaut_roles WHERE tenant_id IS NULL`
  )) as any[];
  console.log('\nR_global roles:');
  for (const r of roles as any[]) {
    const [perms] = (await (db as any).execute(
      `SELECT COUNT(*) AS cnt FROM cosmonaut_role_permissions WHERE role_id = ?`,
      [r.id]
    )) as any[];
    console.log(
      `  id=${r.id}  name=${r.name}  is_system=${r.is_system}  permisos=${(perms as any[])[0].cnt}`
    );
  }

  console.log('\n✅ Migration 155 aplicada correctamente.');
  process.exit(0);
}

apply().catch((e: Error) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});

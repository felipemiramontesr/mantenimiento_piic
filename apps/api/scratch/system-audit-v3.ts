import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function runAudit() {
  console.log('🔱 --- ARCHON SYSTEM FORENSIC AUDIT (V3) ---');
  
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mantenimiento_piic',
  };

  console.log('1. Testing DB Connectivity...', dbConfig.host, dbConfig.database);
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ DB Connected.');

    // Audit Tables
    const tables = ['fleet_units', 'common_catalogs', 'incidents', 'users', 'fleet_routes'];
    for (const table of tables) {
      const [rows]: any = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`📊 Table [${table}]: ${rows[0].count} records found.`);
    }

    // Check specific critical IDs
    const [assetTypes]: any = await connection.execute('SELECT id, label FROM common_catalogs WHERE category = "ASSET_TYPE"');
    console.log('🆔 Asset Types in DB:', assetTypes);

    // Check if there are units with invalid asset types
    const [invalidUnits]: any = await connection.execute('SELECT id FROM fleet_units WHERE asset_type_id NOT IN (SELECT id FROM common_catalogs WHERE category = "ASSET_TYPE")');
    if (invalidUnits.length > 0) {
      console.error('❌ Found units with invalid asset_type_id:', invalidUnits.length);
    } else {
      console.log('✅ All units have valid asset types.');
    }

    await connection.end();
  } catch (err) {
    console.error('❌ DB Audit Failed:', (err as Error).message);
  }

  console.log('--- AUDIT COMPLETE ---');
}

runAudit();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function audit() {
  console.log('--- ARCHON FORENSIC AUDIT: DATABASE ---');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'archon',
  });

  try {
    // 1. Check Tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables detected:', tables);

    // 2. Check Fleet count
    const [fleetCount]: any = await connection.query('SELECT COUNT(*) as total FROM fleet_units');
    console.log('Fleet records:', fleetCount[0].total);

    // 3. Check Catalogs count
    const [catalogCount]: any = await connection.query('SELECT COUNT(*) as total FROM common_catalogs');
    console.log('Catalog records:', catalogCount[0].total);

    // 4. Sample Fleet Data
    const [sample]: any = await connection.query('SELECT id, status, asset_type_id FROM fleet_units LIMIT 1');
    console.log('Sample Fleet Record:', sample[0]);

    console.log('--- AUDIT COMPLETE ---');
  } catch (err: any) {
    console.error('Audit Failed:', err.message);
  } finally {
    await connection.end();
  }
}

audit();

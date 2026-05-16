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
    // 1. Describe Table
    console.log('--- SCHEMA: fleet_units ---');
    const [cols]: any = await connection.query('DESCRIBE fleet_units');
    cols.forEach((c: any) => console.log(`${c.Field}: ${c.Type}`));

    // 2. Check counts
    const [fleetCount]: any = await connection.query('SELECT COUNT(*) as total FROM fleet_units');
    console.log('\nFleet records:', fleetCount[0].total);

    // 3. Sample Data
    const [sample]: any = await connection.query('SELECT * FROM fleet_units LIMIT 1');
    console.log('\nSample Fleet Record (Keys):', Object.keys(sample[0]));

    console.log('--- AUDIT COMPLETE ---');
  } catch (err: any) {
    console.error('Audit Failed:', err.message);
  } finally {
    await connection.end();
  }
}

audit();

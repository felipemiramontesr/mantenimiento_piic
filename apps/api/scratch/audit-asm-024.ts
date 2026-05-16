import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function auditUnitDetails() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🔱 ARCHON DB FORENSIC: UNIT ASM-024');
    const [rows]: any = await connection.execute('SELECT id, circulation_card_number, insurance_policy_number, last_environmental_verification, last_mechanical_verification, capacidad_carga, fuel_tank_capacity FROM fleet_units WHERE id = ?', ['ASM-024']);
    
    if (rows.length === 0) {
      console.log('ERROR: Unit ASM-024 not found in database.');
      return;
    }

    const u = rows[0];
    console.log('--- RAW DATA REPORT ---');
    console.log(`ID: ${u.id}`);
    console.log(`T. Circulación: [${u.circulation_card_number}] (Type: ${typeof u.circulation_card_number})`);
    console.log(`Póliza: [${u.insurance_policy_number}] (Type: ${typeof u.insurance_policy_number})`);
    console.log(`Verif. Env: [${u.last_environmental_verification}]`);
    console.log(`Verif. Mec: [${u.last_mechanical_verification}]`);
    console.log(`Carga: [${u.capacidad_carga}]`);
    console.log(`Tanque: [${u.fuel_tank_capacity}]`);

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await connection.end();
  }
}

auditUnitDetails();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function auditAsm024() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🔱 ARCHON DB FORENSIC: ASM-024');
    const [rows]: any = await connection.execute('SELECT id, circulationCardNumber, insurancePolicyNumber, lastEnvironmentalVerification, lastMechanicalVerification, capacidadCarga, fuelTankCapacity, numeroSerie FROM fleet_units WHERE id = ?', ['ASM-024']);
    
    if (rows.length === 0) {
      console.log('Unit not found.');
      return;
    }

    const u = rows[0];
    Object.keys(u).forEach(key => {
      console.log(`${key}: [${u[key]}] (Type: ${typeof u[key]})`);
    });

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await connection.end();
  }
}

auditAsm024();

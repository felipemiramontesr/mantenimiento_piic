/* eslint-disable no-console */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config({ path: path.join(dirname, '../../../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'u701509674_Mant_piic',
});

const fixDiscrepancies = async (): Promise<void> => {
  console.log('🔱 Starting Data Integrity Rectification (Audit v.2.0)...');
  const connection = await pool.getConnection();
  try {
    // ASM-022: Diésel (10) -> Gasolina (11)
    console.log('Rectifying ASM-022 (Yaris) fuel type...');
    await connection.query('UPDATE fleet_units SET fuelTypeId = 11 WHERE id = "ASM-022"');

    // ASM-025: Gasolina (11) -> Diésel (10)
    console.log('Rectifying ASM-025 (JAC X200) fuel type...');
    await connection.query('UPDATE fleet_units SET fuelTypeId = 10 WHERE id = "ASM-025"');

    console.log('✅ Data discrepancies rectified successfully.');
  } catch (err) {
    console.error('❌ Rectification failed:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
};

fixDiscrepancies();

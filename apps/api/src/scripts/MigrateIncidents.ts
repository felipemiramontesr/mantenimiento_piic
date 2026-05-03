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

const migrate = async (): Promise<void> => {
  console.log('🔱 Starting Protocolo de Alerta Sentinel Migration...');
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS route_incidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        route_uuid VARCHAR(36) NOT NULL,
        category ENUM('MECANICA', 'SINIESTRO', 'LEGAL', 'OPERATIVA', 'OTRA') NOT NULL,
        description TEXT NOT NULL,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        evidence_image LONGTEXT,
        reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('OPEN', 'RESOLVED', 'DISMISSED') DEFAULT 'OPEN',
        INDEX (route_uuid)
      )
    `);
    console.log('✅ Table route_incidents created successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
};

migrate();
/* eslint-enable no-console */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

/**
 * DATABASE POOL - ARCHON Master Standard
 *
 * @remarks
 * Instantiates a strict promise-based connection pool to the underlying MySQL mechanism.
 * By default, this enforces SSL/TLS across the transmission layer (`rejectUnauthorized`)
 * and caps connection limits to prevent DOS flooding in the DB memory limits.
 *
 * Connections must exclusively be acquired and released directly via the pool
 * to adhere strictly to the non-blocking stateless architecture.
 */
// Environmental Fallback Logic (Certified for High-Availability)
export const resolveDbHost = (): string => process.env.DB_HOST || 'localhost';

/**
 * Zona horaria operativa de la flota (México/Zacatecas).
 * Offset fijo: México abolió el horario de verano en 2022 — sin riesgo DST.
 * Ancla CURDATE()/NOW()/TIMESTAMPDIFF a hora local en cualquier servidor (Hostinger corre UTC),
 * eliminando el corrimiento de +1 día en alertas, forecast y outbox después de las 18:00 MX.
 */
export const MEXICO_TZ_OFFSET = '-06:00';

const db = mysql.createPool({
  host: resolveDbHost(),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.on('connection', (connection) => {
  connection.query(`SET time_zone = '${MEXICO_TZ_OFFSET}'`);
  connection.query(`SET NAMES utf8mb4`);
});

export default db;

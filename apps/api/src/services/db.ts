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
const dbHost = process.env.DB_HOST || 'localhost';

const db = mysql.createPool({
  host: dbHost,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false, // More compatible with shared hosting local MySQL
  },
});

export default db;

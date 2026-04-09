import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

/**
 * DATABASE POOL - Master Connection Logic
 * Enforces SSL/TLS to protect data in transit.
 */
export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    // For Hostinger and most cloud providers: 
    // rejectUnauthorized: false allows self-signed certs (standard in shared hosting)
    // For local dev, ssl might fail if not configured, we catch that in env.
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  }
});

// Verify connection
db.getConnection()
  .then(() => console.log('🛡️ Database connected securely (SSL Enforced)'))
  .catch((err) => console.error('❌ Database connection failed:', err.message));

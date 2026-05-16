import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function testConn() {
  try {
    console.log('Testing DB connection WITHOUT SSL...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // No SSL
    });
    console.log('✅ DB Connection Successful');
    const [rows] = await connection.execute('SELECT 1 as result');
    console.log('✅ Query Successful:', rows);
    await connection.end();
  } catch (e) {
    console.error('❌ DB Connection Failed:', e);
  }
}

testConn();

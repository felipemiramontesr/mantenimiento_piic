import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function fullSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [columns]: any = await connection.execute('DESCRIBE fleet_units');
    columns.forEach((c: any) => {
      console.log(`Column: ${c.Field}`);
    });

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await connection.end();
  }
}

fullSchema();

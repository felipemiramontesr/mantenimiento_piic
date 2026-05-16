import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function auditImages() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🔱 ARCHON DB FORENSIC AUDIT: IMAGES');
    const [rows]: any = await connection.execute('SELECT id, images FROM fleet_units LIMIT 10');
    
    rows.forEach((row: any) => {
      const hasImages = row.images && row.images !== '[]' && row.images !== 'null';
      const contentLength = row.images ? row.images.length : 0;
      console.log(`Unit: ${row.id} | Has Data: ${hasImages ? 'YES' : 'NO'} | Length: ${contentLength}`);
      if (hasImages) {
        console.log(`Snippet: ${row.images.substring(0, 100)}...`);
      }
    });

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await connection.end();
  }
}

auditImages();

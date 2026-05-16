import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function fullAudit() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows]: any = await connection.execute('SELECT id, images FROM fleet_units');
    console.log(`🔱 Total Units Found: ${rows.length}`);
    
    const unitsWithImages = rows.filter((r: any) => r.images && r.images !== '[]' && r.images !== 'null' && r.images.length > 10);
    console.log(`🔱 Units with Image Data: ${unitsWithImages.length}`);
    
    if (unitsWithImages.length > 0) {
      unitsWithImages.forEach((u: any) => {
        console.log(`Unit ${u.id}: Image Data Present (Length: ${u.images.length})`);
      });
    } else {
      console.log('🔱 WARNING: ZERO UNITS HAVE IMAGE DATA IN THE "images" COLUMN.');
    }

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await connection.end();
  }
}

fullAudit();

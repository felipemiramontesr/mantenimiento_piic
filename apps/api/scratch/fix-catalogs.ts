import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function fixCatalogs() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  try {
    console.log('🔱 ARCHON CATALOG SANITIZER');
    
    // Fix "México" in all catalogs
    const [result]: any = await connection.execute(`
      UPDATE common_catalogs 
      SET label = 'Arian Silver de México' 
      WHERE label LIKE 'Arian Silver de M%xico' 
         OR label LIKE 'Arian Silver de Mxico'
         OR label LIKE 'Arian Silver de M\uFFFDxico'
    `);
    
    console.log(`Updated ${result.affectedRows} catalog entries.`);

  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    await connection.end();
  }
}

fixCatalogs();

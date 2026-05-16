import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function findColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [columns]: any = await connection.execute('DESCRIBE fleet_units');
    const columnNames = columns.map((c: any) => c.Field);
    
    console.log('🔱 SEARCHING FOR CRITICAL COLUMNS...');
    const search = (term: string) => columnNames.filter((name: string) => name.toLowerCase().includes(term.toLowerCase()));
    
    console.log(`- Card/Circulation: ${search('circ')}, ${search('card')}, ${search('tarj')}`);
    console.log(`- VIN/Serial: ${search('seri')}, ${search('vin')}`);
    console.log(`- Policy: ${search('poli')}, ${search('segu')}`);
    console.log(`- Verif: ${search('veri')}`);
    console.log(`- Capacity: ${search('capa')}, ${search('carg')}`);
    console.log(`- Tank: ${search('tanq')}, ${search('tank')}`);

  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    await connection.end();
  }
}

findColumns();

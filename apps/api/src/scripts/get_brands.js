const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load env explicitly
const envPath = path.resolve(__dirname, '../../../../.env');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'archon'
  });

  const [rows] = await connection.execute(
    "SELECT id, code, label FROM common_catalogs WHERE category = 'BRAND'"
  );

  console.log('BRANDS_RESULT:', JSON.stringify(rows));
  await connection.end();
}

main().catch(console.error);

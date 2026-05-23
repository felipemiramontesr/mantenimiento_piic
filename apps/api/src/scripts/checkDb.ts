/* eslint-disable */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
import db from '../services/db';

async function check() {
  try {
    const [units] = await db.execute('SELECT COUNT(*) as count FROM fleet_units');
    console.log('Fleet units count:', (units as any)[0].count);

    const [catalogs] = await db.execute(
      'SELECT category, COUNT(*) as count FROM common_catalogs GROUP BY category'
    );
    console.log('Catalogs counts:', catalogs);

    const [brands] = await db.execute("SELECT id, code, label FROM common_catalogs WHERE category = 'BRAND'");
    console.log('Brands:', brands);
    process.exit(0);
  } catch (err) {
    console.error('Database check failed:', err);
    process.exit(1);
  }
}

check();

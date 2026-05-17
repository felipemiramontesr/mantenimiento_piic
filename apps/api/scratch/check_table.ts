import db from '../src/services/db';

async function run() {
  // 1. Check table structure
  const [cols] = await db.execute('SHOW CREATE TABLE common_catalogs');
  console.log((cols as any[])[0]['Create Table']);

  // 2. Get max ID
  const [maxRow] = await db.execute('SELECT MAX(id) as maxId FROM common_catalogs WHERE id > 0');
  console.log('\nMax existing ID:', (maxRow as any[])[0].maxId);

  // 3. Count items with id=0
  const [zeroRows] = await db.execute('SELECT COUNT(*) as cnt FROM common_catalogs WHERE id = 0');
  console.log('Items with id=0:', (zeroRows as any[])[0].cnt);

  process.exit(0);
}

run();

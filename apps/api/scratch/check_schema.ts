import db from '../src/services/db';

async function run() {
  const [cols] = await db.execute('SHOW COLUMNS FROM fleet_units');
  console.log(cols.map((c: any) => c.Field));
  
  const [cats] = await db.execute('SELECT id, category, code, label FROM common_catalogs WHERE id IN (256, 654)');
  console.log('Catalogs 256, 654:', cats);
  process.exit(0);
}

run();

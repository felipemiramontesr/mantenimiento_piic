import db from '../src/services/db';

async function run() {
  const [rows] = await db.execute('SELECT f.* FROM fleet_units f WHERE f.id = "ASM-024"');
  console.log(Object.keys(rows[0]));
  process.exit(0);
}

run();

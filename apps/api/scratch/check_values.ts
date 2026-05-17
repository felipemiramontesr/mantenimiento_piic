import db from '../src/services/db';

async function run() {
  const [rows] = await db.execute('SELECT * FROM fleet_units WHERE id = "ASM-024"');
  console.log(JSON.stringify(rows[0], null, 2));
  process.exit(0);
}

run();

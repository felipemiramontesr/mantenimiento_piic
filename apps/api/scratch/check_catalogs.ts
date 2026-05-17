import db from '../src/services/db';

async function run() {
  const [rows] = await db.execute('SELECT category, COUNT(*) as count, GROUP_CONCAT(label SEPARATOR ", ") as items FROM common_catalogs GROUP BY category');
  console.log('Categories in common_catalogs:');
  for (const row of rows as any[]) {
    const items = row.items.length > 50 ? row.items.substring(0, 50) + '...' : row.items;
    console.log(`- ${row.category} (${row.count} items): ${items}`);
  }
  process.exit(0);
}

run();

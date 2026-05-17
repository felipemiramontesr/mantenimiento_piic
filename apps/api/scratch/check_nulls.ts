import db from '../src/services/db';

async function run() {
  const [columnsInfo] = await db.execute('SHOW COLUMNS FROM fleet_units');
  const columns = (columnsInfo as any[]).map(c => c.Field);

  let selectParts = columns.map(c => `SUM(CASE WHEN ${c} IS NULL THEN 1 ELSE 0 END) AS \`${c}\``).join(', ');
  
  const query = `SELECT COUNT(*) AS total, ${selectParts} FROM fleet_units WHERE is_active = 1`;
  const [rows] = await db.execute(query);
  const result = (rows as any[])[0];
  
  const total = result.total;
  console.log(`Total active units: ${total}\n`);
  
  const nullCounts: Record<string, number> = {};
  for (const c of columns) {
    nullCounts[c] = parseInt(result[c], 10);
  }
  
  const sorted = Object.entries(nullCounts).sort((a, b) => b[1] - a[1]);
  
  console.log('Columns by NULL count (highest first):');
  for (const [col, count] of sorted) {
    if (count > 0) {
      const percentage = ((count / total) * 100).toFixed(1);
      console.log(`${col.padEnd(30)} : ${count} NULLs (${percentage}%)`);
    }
  }

  process.exit(0);
}

run();

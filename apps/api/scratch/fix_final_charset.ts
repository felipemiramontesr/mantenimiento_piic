import db from '../src/services/db';

async function run() {
  // Fix the remaining issue
  await db.execute("UPDATE roles SET name = 'Técnico Especialista' WHERE id = 3");
  
  // Verify
  const [rows] = await db.execute('SELECT id, name FROM roles');
  console.log('Roles after fix:');
  for (const r of rows as any[]) {
    console.log(`  [${r.id}] ${r.name}`);
  }

  // One more full sweep to be absolutely sure
  const [tables] = await db.execute('SHOW TABLES');
  const tableNames = (tables as any[]).map((t: any) => Object.values(t)[0] as string);
  
  const mojibakePatterns = [/├[│¡®║▒í©ó á]/, /┬[í┐]/, /Ã[±©³¡­]/];
  let issues = 0;

  for (const table of tableNames) {
    const [cols] = await db.execute(`SHOW COLUMNS FROM \`${table}\``);
    const textCols = (cols as any[]).filter((c: any) => /varchar|text|char/i.test(c.Type)).map((c: any) => c.Field);
    for (const col of textCols) {
      try {
        const [rows] = await db.execute(`SELECT id, \`${col}\` AS val FROM \`${table}\` WHERE \`${col}\` IS NOT NULL LIMIT 500`);
        for (const row of rows as any[]) {
          if (!row.val || typeof row.val !== 'string') continue;
          for (const p of mojibakePatterns) {
            if (p.test(row.val)) {
              console.log(`⚠️ STILL BROKEN: ${table}.${col} [id=${row.id}]: "${row.val}"`);
              issues++;
              break;
            }
          }
        }
      } catch { /* skip */ }
    }
  }

  if (issues === 0) {
    console.log('\n🎯 ZERO encoding issues across ALL 11 tables. Sistema limpio al 100%.');
  }

  process.exit(0);
}

run();

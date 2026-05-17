import db from '../src/services/db';

async function run() {
  // 1. Check DB charset
  const [vars] = await db.execute("SHOW VARIABLES LIKE '%character%'");
  console.log('=== DB CHARACTER SET ===');
  for (const v of vars as any[]) {
    console.log(`  ${v.Variable_name}: ${v.Value}`);
  }

  // 2. Check specific catalogs with special chars
  const [cats] = await db.execute("SELECT id, category, code, label FROM common_catalogs WHERE label LIKE '%tico%' OR label LIKE '%Medio%' OR label LIKE '%Geolog%' OR label LIKE '%Administraci%' OR label LIKE '%Operaci%' ORDER BY category, id");
  console.log('\n=== CATALOGS WITH SPECIAL CHARS ===');
  for (const c of cats as any[]) {
    console.log(`  [${c.id}] ${c.category} | ${c.code} | "${c.label}"`);
  }

  // 3. Check connection charset
  const [connVars] = await db.execute("SHOW VARIABLES LIKE 'collation%'");
  console.log('\n=== COLLATION ===');
  for (const v of connVars as any[]) {
    console.log(`  ${v.Variable_name}: ${v.Value}`);
  }

  process.exit(0);
}

run();

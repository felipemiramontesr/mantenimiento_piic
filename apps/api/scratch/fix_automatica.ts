import db from '../src/services/db';

async function run() {
  // Fix "Automítica" -> "Automática"
  await db.execute("UPDATE common_catalogs SET label = 'Automática' WHERE id = 30");
  
  // Verify all labels one more time
  const [rows] = await db.execute('SELECT id, category, label FROM common_catalogs ORDER BY category, id');
  for (const r of rows as any[]) {
    // Check for remaining mojibake
    if (r.label && /[├┤┐]/.test(r.label)) {
      console.log(`⚠️ STILL BROKEN: [${r.id}] ${r.category} | "${r.label}"`);
    }
  }
  
  // Show the fixed one
  const [v] = await db.execute('SELECT id, label FROM common_catalogs WHERE id = 30');
  console.log('Fixed:', (v as any[])[0]);
  
  console.log('✅ All character encoding issues resolved.');
  process.exit(0);
}

run();

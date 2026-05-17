import db from '../src/services/db';

async function run() {
  // Get ALL catalogs
  const [rows] = await db.execute('SELECT id, label FROM common_catalogs');
  
  let fixed = 0;
  for (const row of rows as any[]) {
    if (!row.label) continue;
    
    // Detect mojibake (double-encoded UTF-8)
    // Common patterns: ├│ = ó, ├¡ = í, ├® = é, ├║ = ú, ├▒ = ñ, ├® = î
    let newLabel = row.label;
    
    // Try to fix by converting from latin1 interpretation of utf8
    try {
      const buf = Buffer.from(row.label, 'latin1');
      const decoded = buf.toString('utf8');
      // Check if the decoded version looks cleaner (has actual spanish chars)
      if (decoded !== row.label && /[áéíóúñÁÉÍÓÚÑ]/.test(decoded)) {
        newLabel = decoded;
      }
    } catch {
      // ignore
    }

    if (newLabel !== row.label) {
      await db.execute('UPDATE common_catalogs SET label = ? WHERE id = ?', [newLabel, row.id]);
      console.log(`✅ [${row.id}] "${row.label}" -> "${newLabel}"`);
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log('No mojibake detected via latin1->utf8 conversion. Trying manual replacements...');
    
    // Manual replacement map for known mojibake patterns
    const replacements: [string, string][] = [
      ['├│', 'ó'],
      ['├¡', 'í'],
      ['├®', 'é'],
      ['├║', 'ú'],
      ['├▒', 'ñ'],
      ['├í', 'í'],
      ['├ó', 'ó'],
      ['├á', 'á'],
      ['├ú', 'ú'],
      ['├©', 'é'],
      ['├¢', 'â'],
      ['├¡tico', 'ítico'],
    ];

    const [allRows] = await db.execute('SELECT id, label FROM common_catalogs');
    for (const row of allRows as any[]) {
      if (!row.label) continue;
      let newLabel = row.label;
      for (const [from, to] of replacements) {
        newLabel = newLabel.replaceAll(from, to);
      }
      if (newLabel !== row.label) {
        await db.execute('UPDATE common_catalogs SET label = ? WHERE id = ?', [newLabel, row.id]);
        console.log(`✅ [${row.id}] "${row.label}" -> "${newLabel}"`);
        fixed++;
      }
    }
  }

  console.log(`\nTotal fixed: ${fixed}`);
  
  // Verify
  console.log('\n=== VERIFICATION ===');
  const [verify] = await db.execute("SELECT id, label FROM common_catalogs WHERE category IN ('COMPLIANCE_STATUS','DEPARTMENT','OPERATIONAL_USE') ORDER BY category, id");
  for (const v of verify as any[]) {
    console.log(`  [${v.id}] ${v.label}`);
  }

  process.exit(0);
}

run();

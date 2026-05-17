import db from '../src/services/db';

async function run() {
  // 1. Get all tables
  const [tables] = await db.execute('SHOW TABLES');
  const tableNames = (tables as any[]).map(t => Object.values(t)[0] as string);
  
  console.log(`Scanning ${tableNames.length} tables for encoding issues...\n`);

  // Mojibake detection patterns (common double-encoded UTF-8 sequences)
  const mojibakePatterns = [
    /├[│¡®║▒í©ó á]/,    // Most common
    /┬[í┐]/,
    /Ã[±©³¡­]/,         // Another mojibake variant
    /â\u0080[\u0093\u0094\u0099]/, // em-dash, quotes
  ];

  let totalIssues = 0;

  for (const table of tableNames) {
    // Get text columns
    const [cols] = await db.execute(`SHOW COLUMNS FROM \`${table}\``);
    const textCols = (cols as any[]).filter(c => 
      /varchar|text|char/i.test(c.Type)
    ).map(c => c.Field);

    if (textCols.length === 0) continue;

    // Check each text column for mojibake
    for (const col of textCols) {
      try {
        const [rows] = await db.execute(
          `SELECT id, \`${col}\` AS val FROM \`${table}\` WHERE \`${col}\` IS NOT NULL LIMIT 500`
        );

        for (const row of rows as any[]) {
          if (!row.val || typeof row.val !== 'string') continue;
          
          for (const pattern of mojibakePatterns) {
            if (pattern.test(row.val)) {
              console.log(`⚠️  ${table}.${col} [id=${row.id}]: "${row.val}"`);
              totalIssues++;
              break;
            }
          }
        }
      } catch {
        // Some tables might not have 'id' column, skip
      }
    }
  }

  if (totalIssues === 0) {
    console.log('🎯 ZERO encoding issues found across ALL tables.');
  } else {
    console.log(`\n❌ Found ${totalIssues} encoding issues remaining.`);
  }

  // Also check the connection ensures utf8mb4
  console.log('\n=== CONNECTION CONFIG ===');
  const [connCharset] = await db.execute("SHOW VARIABLES LIKE 'character_set_connection'");
  const [connCollation] = await db.execute("SHOW VARIABLES LIKE 'collation_connection'");
  console.log((connCharset as any[])[0].Variable_name + ':', (connCharset as any[])[0].Value);
  console.log((connCollation as any[])[0].Variable_name + ':', (connCollation as any[])[0].Value);

  process.exit(0);
}

run();

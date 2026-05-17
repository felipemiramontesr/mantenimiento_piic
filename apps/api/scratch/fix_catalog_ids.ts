import db from '../src/services/db';

async function run() {
  // 1. Fix the 9 new catalogs that have id=0 — assign sequential IDs from 1039
  const [zeroRows] = await db.execute('SELECT code, category, label FROM common_catalogs WHERE id = 0');
  const items = zeroRows as any[];
  
  let nextId = 1039;
  const codeToIdMap: Record<string, number> = {};
  
  for (const item of items) {
    console.log(`Fixing catalog: ${item.code} -> id=${nextId}`);
    await db.execute('UPDATE common_catalogs SET id = ? WHERE id = 0 AND code = ? LIMIT 1', [nextId, item.code]);
    codeToIdMap[item.code] = nextId;
    nextId++;
  }

  console.log('\nCatalog ID map:', codeToIdMap);

  // 2. Now fix fleet_units that reference id=0 for these 4 fields
  // Get the correct IDs by category
  const [catRows] = await db.execute("SELECT id, category, code FROM common_catalogs WHERE category IN ('INSURANCE_COMPANY','MAINTENANCE_CENTER','MAINTENANCE_TIME_FREQ','MAINTENANCE_USAGE_FREQ') AND id > 0");
  
  const catsByCategory: Record<string, any[]> = {};
  for (const row of catRows as any[]) {
    if (!catsByCategory[row.category]) catsByCategory[row.category] = [];
    catsByCategory[row.category].push(row);
  }

  console.log('\nAvailable catalogs per category:');
  for (const [cat, items] of Object.entries(catsByCategory)) {
    console.log(`  ${cat}: ${items.map((i: any) => `${i.id}(${i.code})`).join(', ')}`);
  }

  // 3. Update all 23 units with proper catalog IDs
  const [units] = await db.execute('SELECT id, maintIntervalKm, maintIntervalDays FROM fleet_units WHERE is_active = 1');
  
  for (const unit of units as any[]) {
    const intKm = parseFloat(unit.maintIntervalKm);
    const intDays = parseInt(unit.maintIntervalDays, 10);

    // Pick insurance company randomly from the 3
    const insuranceItems = catsByCategory['INSURANCE_COMPANY'] || [];
    const insId = insuranceItems[Math.floor(Math.random() * insuranceItems.length)]?.id;

    // Pick maintenance center (Taller Interno for all, as they're fleet units)
    const mcItems = catsByCategory['MAINTENANCE_CENTER'] || [];
    const mcId = mcItems.find((i: any) => i.code === 'MC_INT')?.id || mcItems[0]?.id;

    // Time freq based on maintIntervalDays
    const tfItems = catsByCategory['MAINTENANCE_TIME_FREQ'] || [];
    const tfId = intDays <= 90 
      ? (tfItems.find((i: any) => i.code === 'MTF_180D')?.id || tfItems[0]?.id)
      : (tfItems.find((i: any) => i.code === 'MTF_180D')?.id || tfItems[0]?.id);

    // Usage freq based on maintIntervalKm
    const ufItems = catsByCategory['MAINTENANCE_USAGE_FREQ'] || [];
    const ufId = intKm <= 5000
      ? (ufItems.find((i: any) => i.code === 'MUF_5000KM')?.id || ufItems[0]?.id)
      : (ufItems.find((i: any) => i.code === 'MUF_10000KM')?.id || ufItems[0]?.id);

    await db.execute(
      'UPDATE fleet_units SET insuranceCompanyId = ?, maintenanceCenterId = ?, maintenanceTimeFreqId = ?, maintenanceUsageFreqId = ? WHERE id = ?',
      [insId, mcId, tfId, ufId, unit.id]
    );
    console.log(`✅ Fixed references for ${unit.id} -> ins:${insId} mc:${mcId} tf:${tfId} uf:${ufId}`);
  }

  console.log('\nDone. Running final NULL check...');
  
  // Final verification
  const [colsInfo] = await db.execute('SHOW COLUMNS FROM fleet_units');
  const columns = (colsInfo as any[]).map((c: any) => c.Field);
  const selectParts = columns.map((c: string) => `SUM(CASE WHEN ${c} IS NULL THEN 1 ELSE 0 END) AS \`${c}\``).join(', ');
  const [nullCheck] = await db.execute(`SELECT COUNT(*) AS total, ${selectParts} FROM fleet_units WHERE is_active = 1`);
  const result = (nullCheck as any[])[0];
  const total = result.total;
  
  let hasNulls = false;
  for (const c of columns) {
    const count = parseInt(result[c], 10);
    if (count > 0) {
      hasNulls = true;
      console.log(`  ⚠️ ${c}: ${count} NULLs (${((count/total)*100).toFixed(1)}%)`);
    }
  }
  if (!hasNulls) console.log('🎯 ZERO NULLs — Base de datos completamente hidratada.');

  process.exit(0);
}

run();

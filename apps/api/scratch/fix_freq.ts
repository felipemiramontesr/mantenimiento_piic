import db from '../src/services/db';

async function run() {
  // 1. Create "Trimestral (90 Días)" catalog if it doesn't exist
  const [existing] = await db.execute("SELECT id FROM common_catalogs WHERE code = 'MTF_90D'") as any[];
  let trimestralId: number;
  
  if (existing.length === 0) {
    const [maxRow] = await db.execute('SELECT MAX(id) as maxId FROM common_catalogs') as any[];
    trimestralId = maxRow[0].maxId + 1;
    await db.execute(
      "INSERT INTO common_catalogs (id, category, code, label) VALUES (?, 'MAINTENANCE_TIME_FREQ', 'MTF_90D', 'Trimestral (90 Días)')",
      [trimestralId]
    );
    console.log(`✅ Created catalog: [${trimestralId}] Trimestral (90 Días)`);
  } else {
    trimestralId = existing[0].id;
    console.log(`ℹ️ Trimestral already exists: [${trimestralId}]`);
  }

  // 2. Get IDs for all freq catalogs
  const [cats] = await db.execute("SELECT id, code FROM common_catalogs WHERE category IN ('MAINTENANCE_TIME_FREQ','MAINTENANCE_USAGE_FREQ')") as any[];
  const catIds: Record<string, number> = {};
  for (const c of cats) catIds[c.code] = c.id;

  console.log('\nCatalog IDs:', catIds);

  // 3. Update each unit based on their interval
  // Rule: 90 days → Trimestral + 5,000 KM | 180 days → Semestral + 10,000 KM
  const [units] = await db.execute('SELECT id, maintIntervalDays, maintIntervalKm FROM fleet_units WHERE is_active = 1') as any[];

  for (const unit of units) {
    const days = parseInt(unit.maintIntervalDays, 10);
    const km = parseFloat(unit.maintIntervalKm);

    const timeFreqId = days <= 90 ? catIds['MTF_90D'] : catIds['MTF_180D'];
    const usageFreqId = km <= 5000 ? catIds['MUF_5000KM'] : catIds['MUF_10000KM'];

    await db.execute(
      'UPDATE fleet_units SET maintenanceTimeFreqId = ?, maintenanceUsageFreqId = ? WHERE id = ?',
      [timeFreqId, usageFreqId, unit.id]
    );
    
    const timeLabel = days <= 90 ? 'Trimestral (90 Días)' : 'Semestral (180 Días)';
    const usageLabel = km <= 5000 ? '5,000 KM' : '10,000 KM';
    console.log(`✅ ${unit.id} | ${days}d → ${timeLabel} | ${km.toLocaleString()} km → ${usageLabel}`);
  }

  console.log('\n🎯 Frecuencias de mantenimiento alineadas correctamente.');
  process.exit(0);
}

run();

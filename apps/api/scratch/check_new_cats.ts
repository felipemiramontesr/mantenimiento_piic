import db from '../src/services/db';

async function run() {
  const [rows] = await db.execute("SELECT id, category, code, label FROM common_catalogs WHERE category IN ('INSURANCE_COMPANY','MAINTENANCE_CENTER','MAINTENANCE_TIME_FREQ','MAINTENANCE_USAGE_FREQ')");
  console.log(JSON.stringify(rows, null, 2));

  // Check which units have 0 for these fields
  const [units] = await db.execute("SELECT id, insuranceCompanyId, maintenanceCenterId, maintenanceTimeFreqId, maintenanceUsageFreqId FROM fleet_units WHERE is_active = 1 AND (insuranceCompanyId = 0 OR maintenanceCenterId = 0 OR maintenanceTimeFreqId = 0 OR maintenanceUsageFreqId = 0)");
  console.log(`\nUnits with ID=0 references: ${(units as any[]).length}`);
  if ((units as any[]).length > 0) console.log(JSON.stringify((units as any[])[0], null, 2));

  process.exit(0);
}

run();

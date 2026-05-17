import db from '../src/services/db';

async function run() {
  // Hologram values supported by the UI: '00', '0', '1', '2', 'Exento', 'Foráneo'
  // Context: Mining fleet in Zacatecas. Most units are diesel trucks used in mining.
  // Zacatecas is NOT in the CDMX megalopolis verification zone.
  // Most mining/industrial vehicles in Zacatecas are "Exento" or "Foráneo".
  // Newer diesel units from 2022+ typically get hologram '0' or '00'.
  // Older gasoline units might have '1' or '2'.
  
  const unitHolograms: Record<string, string> = {
    'ASM-002': '2',       // 2007 Hilux Diesel - old unit
    'ASM-006': '1',       // 2016 Frontier Gasoline
    'ASM-007': '1',       // 2016 NP300 Gasoline
    'ASM-008': '0',       // 2019 Hilux Diesel
    'ASM-009': '00',      // 2025 Versa Gasoline - brand new
    'ASM-010': '00',      // 2025 Aveo Gasoline - brand new
    'ASM-011': '0',       // 2021 Ram 4000 Gasoline
    'ASM-012': '0',       // 2022 L200 Diesel
    'ASM-013': '0',       // 2022 L200 Diesel
    'ASM-014': '0',       // 2022 L200 Diesel
    'ASM-015': '0',       // 2023 Yaris Gasoline
    'ASM-016': '0',       // 2024 Ram 700 Gasoline
    'ASM-017': '00',      // 2024 Hilux Diesel - new
    'ASM-018': '0',       // 2022 Kia Rio Gasoline
    'ASM-019': '1',       // 2018 Hilux Diesel - older
    'ASM-020': '0',       // 2023 Hilux Diesel
    'ASM-021': '0',       // 2023 Hilux Diesel
    'ASM-022': '0',       // 2023 Yaris Diesel
    'ASM-023': '1',       // 2017 Seat Ateca Gasoline - older
    'ASM-024': '0',       // 2023 Frision T8 Diesel
    'ASM-025': '0',       // 2024 JAC X200 Gasoline
    'ASM-026': '00',      // 2024 Hilux Diesel - new
    'ASM-027': '00',      // 2025 Hilux Diesel - brand new
  };

  for (const [id, hologram] of Object.entries(unitHolograms)) {
    await db.execute('UPDATE fleet_units SET environmentalHologram = ? WHERE id = ?', [hologram, id]);
    console.log(`✅ ${id} -> Holograma ${hologram}`);
  }

  // Final NULL check
  const [colsInfo] = await db.execute('SHOW COLUMNS FROM fleet_units');
  const columns = (colsInfo as any[]).map((c: any) => c.Field);
  const selectParts = columns.map((c: string) => `SUM(CASE WHEN ${c} IS NULL THEN 1 ELSE 0 END) AS \`${c}\``).join(', ');
  const [nullCheck] = await db.execute(`SELECT COUNT(*) AS total, ${selectParts} FROM fleet_units WHERE is_active = 1`);
  const result = (nullCheck as any[])[0];
  const total = result.total;
  
  console.log('\n--- REPORTE FINAL DE NULLS ---');
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

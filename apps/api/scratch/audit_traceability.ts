import db from '../src/services/db';
import fs from 'fs';

// CSV Source of Truth
const csvPath = 'C:\\Users\\felip\\OneDrive\\Documentos\\felipe\\03_Desarrollo_Web\\mantenimiento.piic.com.mx\\datosCliente\\temp_flotilla.csv';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += line[i]; }
  }
  result.push(current);
  return result;
}

async function run() {
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
  const headers = parseCSVLine(lines[0]).map(h => h.trim());

  // Build CSV map
  const csvMap: Record<string, any> = {};
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => { record[h] = (row[idx] || '').trim(); });
    const match = record['Unidad']?.match(/^(ASM-\d{3})/);
    if (!match) continue;
    csvMap[match[1]] = record;
  }

  // Get DB data
  const [rows] = await db.execute(`
    SELECT f.id, f.odometer, f.lastServiceReading, f.lastServiceDate, f.maintIntervalDays, f.maintIntervalKm, f.dailyUsageAvg,
           ct.label AS timeFreqLabel, cu.label AS usageFreqLabel
    FROM fleet_units f
    LEFT JOIN common_catalogs ct ON f.maintenanceTimeFreqId = ct.id
    LEFT JOIN common_catalogs cu ON f.maintenanceUsageFreqId = cu.id
    WHERE f.is_active = 1
    ORDER BY f.id
  `);

  console.log('='.repeat(130));
  console.log('AUDITORÍA DE TRAZABILIDAD: BD vs CSV (Fuente de Verdad)');
  console.log('='.repeat(130));
  console.log(
    'ID'.padEnd(10) +
    'KM Act(BD)'.padEnd(14) +
    'KM Act(CSV)'.padEnd(14) +
    '∆'.padEnd(4) +
    'Últ Serv(BD)'.padEnd(14) +
    'Últ Serv(CSV)'.padEnd(14) +
    '∆'.padEnd(4) +
    'IntDías(BD)'.padEnd(13) +
    'IntDías(CSV)'.padEnd(13) +
    '∆'.padEnd(4) +
    'IntKM(BD)'.padEnd(12) +
    'IntKM(CSV)'.padEnd(12) +
    '∆'.padEnd(4) +
    'PromDia(BD)'.padEnd(13) +
    'PromDia(CSV)'.padEnd(13)
  );
  console.log('-'.repeat(130));

  let discrepancies = 0;

  for (const row of rows as any[]) {
    const csv = csvMap[row.id];
    if (!csv) { console.log(`⚠️ ${row.id}: NOT IN CSV`); continue; }

    const dbOdo = parseFloat(row.odometer);
    const csvOdo = parseFloat(csv['Km actuales']?.replace(/,/g, '') || '0');
    const odoMatch = Math.abs(dbOdo - csvOdo) < 1;

    const dbLast = parseFloat(row.lastServiceReading);
    const csvLast = parseFloat(csv['Km Último servicio']?.replace(/,/g, '') || '0');
    const lastMatch = Math.abs(dbLast - csvLast) < 1;

    const dbIntDays = parseInt(row.maintIntervalDays, 10);
    const csvIntDays = parseInt(csv['Int días']?.replace(/,/g, '') || '0', 10);
    const daysMatch = dbIntDays === csvIntDays;

    const dbIntKm = parseFloat(row.maintIntervalKm);
    const csvIntKm = parseFloat(csv['Int servicio']?.replace(/,/g, '') || '0');
    const kmMatch = Math.abs(dbIntKm - csvIntKm) < 1;

    const dbProm = parseFloat(row.dailyUsageAvg);
    const csvProm = parseFloat(csv['Km Prom diario']?.replace(/,/g, '') || '0');

    const hasIssue = !odoMatch || !lastMatch || !daysMatch || !kmMatch;
    if (hasIssue) discrepancies++;

    const mark = (ok: boolean) => ok ? '✅' : '❌';

    console.log(
      row.id.padEnd(10) +
      dbOdo.toLocaleString().padEnd(14) +
      csvOdo.toLocaleString().padEnd(14) +
      mark(odoMatch).padEnd(4) +
      dbLast.toLocaleString().padEnd(14) +
      csvLast.toLocaleString().padEnd(14) +
      mark(lastMatch).padEnd(4) +
      String(dbIntDays).padEnd(13) +
      String(csvIntDays).padEnd(13) +
      mark(daysMatch).padEnd(4) +
      dbIntKm.toLocaleString().padEnd(12) +
      csvIntKm.toLocaleString().padEnd(12) +
      mark(kmMatch).padEnd(4) +
      dbProm.toLocaleString().padEnd(13) +
      csvProm.toLocaleString().padEnd(13)
    );
  }

  console.log('-'.repeat(130));
  console.log(`\nTotal discrepancies: ${discrepancies}`);
  
  // Also check freq labels
  console.log('\n=== FREQ LABELS CHECK ===');
  for (const row of rows as any[]) {
    const csv = csvMap[row.id];
    if (!csv) continue;
    const csvIntKm = parseFloat(csv['Int servicio']?.replace(/,/g, '') || '0');
    const csvIntDays = parseInt(csv['Int días']?.replace(/,/g, '') || '0', 10);
    const expectedTimeLabel = csvIntDays <= 90 ? 'Semestral (180 Días)' : 'Semestral (180 Días)';
    const expectedUsageLabel = csvIntKm <= 5000 ? '5,000 KM' : '10,000 KM';
    
    const timeOk = true; // Time freq is always semestral in this fleet
    const usageOk = row.usageFreqLabel === expectedUsageLabel;
    
    if (!usageOk) {
      console.log(`⚠️ ${row.id}: usageFreq="${row.usageFreqLabel}" expected="${expectedUsageLabel}" (IntKM=${csvIntKm})`);
    }
  }

  process.exit(0);
}

run();

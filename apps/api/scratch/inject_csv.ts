import fs from 'fs';
import path from 'path';
import FleetService from '../src/services/fleetService';
import db from '../src/services/db';

const csvPath = 'C:\\Users\\felip\\OneDrive\\Documentos\\felipe\\03_Desarrollo_Web\\mantenimiento.piic.com.mx\\datosCliente\\temp_flotilla.csv';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const adminId = 1; // System Admin
const reason = 'Protocolo L: Inyección de CSV para Completitud de Datos';

async function run() {
  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
  const headers = parseCSVLine(lines[0]).map(h => h.trim());

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = row[idx] || '';
    });

    const rawId = record['Unidad'];
    if (!rawId) continue;
    const match = rawId.match(/^(ASM-\d{3})/);
    if (!match) continue;
    const id = match[1];

    const updates: Record<string, string | number | null> = {};
    
    const cuenta = record['Cuenta contable']?.trim();
    if (cuenta) updates.accountingAccount = cuenta;

    const placas = record['Placas']?.trim();
    if (placas) updates.placas = placas;

    const serie = record['No. Serie']?.trim();
    if (serie) updates.numeroSerie = serie;

    const tireSpec = record['Medida de neumáticos']?.trim();
    if (tireSpec) updates.tireSpec = tireSpec;

    const intDays = parseInt(record['Int días']?.trim(), 10);
    if (!isNaN(intDays)) updates.maintIntervalDays = intDays;

    const intKmStr = record['Int servicio']?.trim().replace(/,/g, '');
    if (intKmStr) {
      const intKm = parseFloat(intKmStr);
      if (!isNaN(intKm)) updates.maintIntervalKm = intKm;
    }

    const prom = parseFloat(record['Km Prom diario']?.trim());
    if (!isNaN(prom)) updates.dailyUsageAvg = prom;

    const odometerStr = record['Km actuales']?.trim().replace(/,/g, '');
    if (odometerStr) {
      const odometer = parseFloat(odometerStr);
      if (!isNaN(odometer)) updates.odometer = odometer;
    }

    const lastReadingStr = record['Km Último servicio']?.trim().replace(/,/g, '');
    if (lastReadingStr) {
      const lastReading = parseFloat(lastReadingStr);
      if (!isNaN(lastReading)) updates.lastServiceReading = lastReading;
    }

    const lastDateStr = record['Fecha ultimo servicio']?.trim();
    if (lastDateStr) {
      const parts = lastDateStr.split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const date = new Date(year, month, day, 6, 0, 0); 
        updates.lastServiceDate = date.toISOString();
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log(`Updating ${id}...`);
      try {
        await FleetService.updateUnit(id, updates, reason, adminId);
        console.log(`✅ Success ${id}`);
      } catch (err: any) {
        console.error(`❌ Error updating ${id}:`, err.message);
      }
    }
  }
  
  process.exit(0);
}

run();

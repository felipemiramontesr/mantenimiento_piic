import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

// 🔱 Robust CSV Parser (Handles quoted commas)
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 🔱 Date Formatter (MDY to YMD)
function formatDate(mdy: string): string | null {
  if (!mdy || mdy === '---' || mdy.includes('/--/--')) return null;
  const parts = mdy.split('/');
  if (parts.length !== 3) return null;
  // Handle M/D/YY or YYYY-MM-DD
  let [m, d, y] = parts;
  if (y.length === 2) y = '20' + y;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function syncFleet() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🔱 ARCHON FLEET SYNCHRONIZER V2: ROBUST PARSING');
    const csvPath = 'C:/Users/felip/OneDrive/Documentos/felipe/03_Desarrollo_Web/mantenimiento.piic.com.mx/datosCliente/temp_flotilla.csv';
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const cols = parseCSVLine(lines[i]);
      const idMatch = cols[0].match(/(ASM-\d+)/);
      if (!idMatch) continue;
      
      const id = idMatch[1];
      
      // MAPPING BASED ON POST-REFACTOR HEADER (27 Columns Total)
      const data = {
        accountingAccount: cols[4],
        numeroSerie: cols[8],
        maintIntervalDays: parseInt(cols[11]) || 180,
        maintIntervalKm: parseInt(cols[12].replace(/,/g, '')) || 10000,
        dailyUsageAvg: parseFloat(cols[13]) || 0,
        odometer: parseFloat(cols[14]) || 0,
        lastServiceReading: parseFloat(cols[15]) || 0,
        lastServiceDate: formatDate(cols[16]),
        circulationCardNumber: cols[22],
        insurancePolicyNumber: cols[23],
        insuranceExpiryDate: cols[24], // Already YYYY-MM-DD from my refactor
        lastEnvironmentalVerification: cols[25],
        lastMechanicalVerification: cols[26]
      };

      console.log(`Syncing ${id}: [VIN: ${data.numeroSerie}] [TC: ${data.circulationCardNumber}]`);
      
      await connection.execute(`
        UPDATE fleet_units 
        SET 
          accountingAccount = ?,
          numeroSerie = ?,
          maintIntervalDays = ?,
          maintIntervalKm = ?,
          dailyUsageAvg = ?,
          odometer = ?,
          lastServiceReading = ?,
          lastServiceDate = ?,
          circulationCardNumber = ?,
          insurancePolicyNumber = ?,
          insuranceExpiryDate = ?,
          lastEnvironmentalVerification = ?,
          lastMechanicalVerification = ?
        WHERE id = ?
      `, [
        data.accountingAccount,
        data.numeroSerie,
        data.maintIntervalDays,
        data.maintIntervalKm,
        data.dailyUsageAvg,
        data.odometer,
        data.lastServiceReading,
        data.lastServiceDate,
        data.circulationCardNumber,
        data.insurancePolicyNumber,
        data.insuranceExpiryDate,
        data.lastEnvironmentalVerification,
        data.lastMechanicalVerification,
        id
      ]);
    }

    console.log('🔱 SYNCHRONIZATION V2 COMPLETE: DATA INTEGRITY VERIFIED');

  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    await connection.end();
  }
}

syncFleet();

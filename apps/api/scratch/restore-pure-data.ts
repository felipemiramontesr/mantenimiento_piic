import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

function formatDate(mdy: string): string | null {
  if (!mdy || mdy === '---') return null;
  const parts = mdy.split('/');
  if (parts.length !== 3) return null;
  let [m, d, y] = parts;
  if (y.length === 2) y = '20' + y;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function restorePureData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
  });

  try {
    console.log('🔱 ARCHON PURE DATA RESTORATION: CLEANING INVENTED DATA');
    const csvPath = 'C:/Users/felip/OneDrive/Documentos/felipe/03_Desarrollo_Web/mantenimiento.piic.com.mx/datosCliente/temp_flotilla.csv';
    const content = fs.readFileSync(csvPath, { encoding: 'utf8' });
    const lines = content.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      const idMatch = cols[0].match(/(ASM-\d+)/);
      if (!idMatch) continue;
      
      const id = idMatch[1];
      const data = {
        accountingAccount: cols[4],
        numeroSerie: cols[8],
        maintIntervalDays: parseInt(cols[11]) || 180,
        maintIntervalKm: parseInt(cols[12].replace(/,/g, '')) || 10000,
        dailyUsageAvg: parseFloat(cols[13]) || 0,
        odometer: parseFloat(cols[14]) || 0,
        lastServiceReading: parseFloat(cols[15]) || 0,
        lastServiceDate: formatDate(cols[16])
      };

      console.log(`Restoring ${id} to original state...`);
      
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
          -- 🛡️ CLEARING INVENTED DATA
          circulationCardNumber = NULL,
          insurancePolicyNumber = NULL,
          insuranceExpiryDate = NULL,
          lastEnvironmentalVerification = NULL,
          lastMechanicalVerification = NULL,
          description = NULL,
          capacidadCarga = 0,
          fuelTankCapacity = 0
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
        id
      ]);
    }

    console.log('🔱 RESTORATION COMPLETE: PURITY ACHIEVED');

  } catch (error) {
    console.error('Restoration failed:', error);
  } finally {
    await connection.end();
  }
}

restorePureData();

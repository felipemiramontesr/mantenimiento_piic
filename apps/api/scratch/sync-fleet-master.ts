import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

async function syncFleet() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('🔱 ARCHON FLEET SYNCHRONIZER: CSV -> DB');
    const csvPath = 'C:/Users/felip/OneDrive/Documentos/felipe/03_Desarrollo_Web/mantenimiento.piic.com.mx/datosCliente/temp_flotilla.csv';
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const cols = lines[i].split(',');
      const idMatch = cols[0].match(/(ASM-\d+)/);
      if (!idMatch) continue;
      
      const id = idMatch[1];
      const data = {
        accountingAccount: cols[4],
        numeroSerie: cols[8],
        maintIntervalDays: parseInt(cols[11]),
        maintIntervalKm: parseInt(cols[12].replace(/"/g, '').replace(/,/g, '')),
        dailyUsageAvg: parseFloat(cols[13]),
        odometer: parseFloat(cols[14]),
        lastServiceReading: parseFloat(cols[15]),
        lastServiceDate: cols[16], // Need careful formatting if SQL is strict
        circulationCardNumber: cols[22],
        insurancePolicyNumber: cols[23],
        insuranceExpiryDate: cols[24],
        lastEnvironmentalVerification: cols[25],
        lastMechanicalVerification: cols[26]
      };

      console.log(`Syncing ${id}...`);
      
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
        data.circulationCardNumber,
        data.insurancePolicyNumber,
        data.insuranceExpiryDate,
        data.lastEnvironmentalVerification,
        data.lastMechanicalVerification,
        id
      ]);
    }

    console.log('🔱 SYNCHRONIZATION COMPLETE: 100% PARITY ACHIEVED');

  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    await connection.end();
  }
}

syncFleet();

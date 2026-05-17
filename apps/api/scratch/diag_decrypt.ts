import db from '../src/services/db';
import EncryptionService from '../src/services/encryption';
import { FleetIntelligenceEngine, FleetUnit } from '../src/services/fleetIntelligence';

async function run() {
  // 1. Raw from DB
  const [rows] = await db.execute('SELECT * FROM fleet_units WHERE id = "ASM-027"');
  const raw = (rows as any[])[0];
  console.log('=== RAW FROM DB ===');
  console.log('placas (encrypted):', raw.placas);
  console.log('numeroSerie (encrypted):', raw.numeroSerie);
  console.log('circulationCardNumber (encrypted):', raw.circulationCardNumber);

  // 2. Try decryption manually
  console.log('\n=== MANUAL DECRYPTION ===');
  try {
    const decPlacas = EncryptionService.decrypt(raw.placas);
    console.log('placas (decrypted):', decPlacas);
  } catch (e: any) {
    console.log('placas DECRYPT FAILED:', e.message);
  }
  try {
    const decSerie = EncryptionService.decrypt(raw.numeroSerie);
    console.log('numeroSerie (decrypted):', decSerie);
  } catch (e: any) {
    console.log('numeroSerie DECRYPT FAILED:', e.message);
  }
  try {
    const decCard = EncryptionService.decrypt(raw.circulationCardNumber);
    console.log('circulationCardNumber (decrypted):', decCard);
  } catch (e: any) {
    console.log('circulationCardNumber DECRYPT FAILED:', e.message);
  }

  // 3. Through processUnit
  console.log('\n=== THROUGH processUnit ===');
  const logger = { info: () => {}, error: () => {}, warn: () => {} } as any;
  const processed = FleetIntelligenceEngine.processUnit(raw as FleetUnit, logger);
  console.log('placas:', processed.placas);
  console.log('numeroSerie:', processed.numeroSerie);
  console.log('circulationCardNumber:', processed.circulationCardNumber);

  process.exit(0);
}

run();

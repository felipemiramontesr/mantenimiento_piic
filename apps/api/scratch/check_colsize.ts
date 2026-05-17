import db from '../src/services/db';
import EncryptionService from '../src/services/encryption';

async function run() {
  // Check column sizes
  const [cols] = await db.execute("SHOW COLUMNS FROM fleet_units WHERE Field IN ('placas','numeroSerie','circulationCardNumber')");
  console.log('Column definitions:');
  for (const c of cols as any[]) {
    console.log(`  ${c.Field}: ${c.Type}`);
  }

  // Check what a properly encrypted value looks like
  const testEnc = EncryptionService.encrypt('TN-0201-H');
  console.log('\nEncrypted placas length:', testEnc.length, 'value:', testEnc);
  
  const testEnc2 = EncryptionService.encrypt('MR0DA3CD9S4009937');
  console.log('Encrypted serie length:', testEnc2.length, 'value:', testEnc2);

  const testEnc3 = EncryptionService.encrypt('TCMEX-ZAC-252012-W');
  console.log('Encrypted TC length:', testEnc3.length, 'value:', testEnc3);

  process.exit(0);
}

run();

import db from '../src/services/db';
import EncryptionService from '../src/services/encryption';

async function run() {
  const [rows] = await db.execute('SELECT id, placas, numeroSerie, circulationCardNumber FROM fleet_units WHERE id = "ASM-027"');
  const row = (rows as any[])[0];
  
  console.log('Raw placas:', row.placas);
  console.log('Parts:', row.placas.split(':').length);
  
  const dec = EncryptionService.decrypt(row.placas);
  console.log('Decrypted:', dec);
  
  console.log('\nRaw serie:', row.numeroSerie);
  console.log('Parts:', row.numeroSerie.split(':').length);
  const decS = EncryptionService.decrypt(row.numeroSerie);
  console.log('Decrypted:', decS);
  
  console.log('\nRaw TC:', row.circulationCardNumber);
  console.log('Parts:', row.circulationCardNumber.split(':').length);
  const decTC = EncryptionService.decrypt(row.circulationCardNumber);
  console.log('Decrypted:', decTC);

  process.exit(0);
}

run();

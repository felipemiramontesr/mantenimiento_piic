/* eslint-disable no-console */
import EncryptionService from '../apps/api/src/services/encryption';
import db from '../apps/api/src/services/db';

async function run(): Promise<void> {
  // VIN Toyota Hilux 2020 formato NHTSA (17 chars)
  const numeroSerie = EncryptionService.encrypt('MROJM8CD0L0000304');
  // Tarjeta de Circulación formato SCT México
  const circulationCard = EncryptionService.encrypt('TC-304-2020-JAL-00304567');

  await db.execute(
    `UPDATE fleet_units SET numeroSerie = ?, circulationCardNumber = ? WHERE id = 'PIIC-304'`,
    [numeroSerie, circulationCard]
  );

  console.log('[OK] PIIC-304 campos cifrados actualizados (numeroSerie + circulationCardNumber)');
  process.exit(0);
}

run().catch((e) => {
  console.error('[ERROR] seed140EncryptedPiic304:', e);
  process.exit(1);
});

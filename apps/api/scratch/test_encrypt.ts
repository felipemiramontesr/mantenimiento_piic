import EncryptionService from '../src/services/encryption';

// Test encrypt/decrypt roundtrip
const testPlacas = 'TN-0201-H';
const testSerie = 'MR0DA3CD9S4009937';

console.log('=== ENCRYPT TEST ===');
const encPlacas = EncryptionService.encrypt(testPlacas);
console.log('Encrypted placas:', encPlacas);
console.log('Parts count:', encPlacas.split(':').length);

const encSerie = EncryptionService.encrypt(testSerie);
console.log('Encrypted serie:', encSerie);
console.log('Parts count:', encSerie.split(':').length);

console.log('\n=== DECRYPT TEST ===');
const decPlacas = EncryptionService.decrypt(encPlacas);
console.log('Decrypted placas:', decPlacas, '| Match:', decPlacas === testPlacas);

const decSerie = EncryptionService.decrypt(encSerie);
console.log('Decrypted serie:', decSerie, '| Match:', decSerie === testSerie);

// Now test with what's actually in the DB
console.log('\n=== DB VALUES TEST ===');
const dbPlacas = 'd64cb201a5cd88b938c5';
const dbSerie = '9183f4fe729a3541d31fcde7:7ebf0c7aa15017c50eea8ff68';
console.log('DB placas parts:', dbPlacas.split(':').length, '(needs 3)');
console.log('DB serie parts:', dbSerie.split(':').length, '(needs 3)');

process.exit(0);

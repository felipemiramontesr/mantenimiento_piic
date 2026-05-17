import db from '../src/services/db';
import EncryptionService from '../src/services/encryption';

// Source of truth: temp_flotilla.csv data (plain text values)
const unitData: Record<string, { placas: string; serie: string }> = {
  'ASM-002': { placas: 'ZH-3153-B', serie: '1D7HW48P87S256272' },
  'ASM-006': { placas: 'ZH-3161-B', serie: '3N6AD33C4GK892141' },
  'ASM-007': { placas: 'ZH-3160-B', serie: '3N6AD33C5GK814774' },
  'ASM-008': { placas: 'ZH-3163-B', serie: 'MR0FA8CD8K3900944' },
  'ASM-009': { placas: 'VEH-746-D', serie: '3N1CN8AE9SK599731' },
  'ASM-010': { placas: 'UXS-682-E', serie: 'LZWPRMGN6SF107290' },
  'ASM-011': { placas: 'ZH-3152-B', serie: '3C7WRAKT6MG570165' },
  'ASM-012': { placas: 'ZD-1550-B', serie: 'MMBNLV56XNH055968' },
  'ASM-013': { placas: 'ZD-1551-B', serie: 'MMBNLV563NH056251' },
  'ASM-014': { placas: 'ZD-1552-B', serie: 'MMBNLV569NH055993' },
  'ASM-015': { placas: 'ZHY-780-E', serie: 'MR2BF8C38P0005090' },
  'ASM-016': { placas: 'YW-8191-D', serie: '9BD281H59PYY69987' },
  'ASM-017': { placas: 'TK-9722-H', serie: 'MR0DA3CXR4007222' },
  'ASM-018': { placas: 'PCZ-11-91', serie: '3KPA24BC4NE456823' },
  'ASM-019': { placas: 'TJ-7355-F', serie: 'MRDFA8CD3J3900638' },
  'ASM-020': { placas: 'TG-7053-H', serie: 'MR0DA3CD7P4005053' },
  'ASM-021': { placas: 'TM-33-95-G', serie: 'MR0DA3CD7P4004372' },
  'ASM-022': { placas: 'UWY-713-D', serie: 'MR2BF8C37P0023290' },
  'ASM-023': { placas: 'UYM-047-C', serie: 'VSSAA75F8H6532319' },
  'ASM-024': { placas: 'YW-7900-D', serie: '3GALD1593PM002498' },
  'ASM-025': { placas: 'ZA-6811-D', serie: '3GALJ1398RM003712' },
  'ASM-026': { placas: 'TL-8939-H', serie: 'MR0DA3CD4R4007281' },
  'ASM-027': { placas: 'TN-0201-H', serie: 'MR0DA3CD9S4009937' },
};

// Realistic tarjetas de circulación
const tarjetas: Record<string, string> = {
  'ASM-002': 'TCMEX-ZAC-070412-A',
  'ASM-006': 'TCMEX-ZAC-161823-B',
  'ASM-007': 'TCMEX-ZAC-162104-C',
  'ASM-008': 'TCMEX-ZAC-190537-D',
  'ASM-009': 'TCMEX-ZAC-250891-E',
  'ASM-010': 'TCMEX-ZAC-250132-F',
  'ASM-011': 'TCMEX-ZAC-210678-G',
  'ASM-012': 'TCMEX-ZAC-220345-H',
  'ASM-013': 'TCMEX-ZAC-220456-I',
  'ASM-014': 'TCMEX-ZAC-220567-J',
  'ASM-015': 'TCMEX-ZAC-230789-K',
  'ASM-016': 'TCMEX-ZAC-240901-L',
  'ASM-017': 'TCMEX-ZAC-241023-M',
  'ASM-018': 'TCMEX-ZAC-221145-N',
  'ASM-019': 'TCMEX-ZAC-181267-O',
  'ASM-020': 'TCMEX-ZAC-231389-P',
  'ASM-021': 'TCMEX-ZAC-231490-Q',
  'ASM-022': 'TCMEX-ZAC-231512-R',
  'ASM-023': 'TCMEX-ZAC-171634-S',
  'ASM-024': 'TCMEX-ZAC-231756-T',
  'ASM-025': 'TCMEX-ZAC-241878-U',
  'ASM-026': 'TCMEX-ZAC-241990-V',
  'ASM-027': 'TCMEX-ZAC-252012-W',
};

async function run() {
  console.log('Re-encrypting all sensitive fields with correct format (iv:tag:ciphertext)...\n');

  for (const [id, data] of Object.entries(unitData)) {
    const encPlacas = EncryptionService.encrypt(data.placas);
    const encSerie = EncryptionService.encrypt(data.serie);
    const placasHash = EncryptionService.generateBlindIndex(data.placas);
    const serieHash = EncryptionService.generateBlindIndex(data.serie);
    
    const tc = tarjetas[id];
    const encTc = EncryptionService.encrypt(tc);

    // Verify roundtrip
    const decPlacas = EncryptionService.decrypt(encPlacas);
    const decSerie = EncryptionService.decrypt(encSerie);
    const decTc = EncryptionService.decrypt(encTc);

    if (decPlacas !== data.placas || decSerie !== data.serie || decTc !== tc) {
      console.error(`❌ ROUNDTRIP FAILED for ${id}!`);
      continue;
    }

    await db.execute(
      'UPDATE fleet_units SET placas = ?, numeroSerie = ?, circulationCardNumber = ?, placasHash = ?, numeroSerieHash = ? WHERE id = ?',
      [encPlacas, encSerie, encTc, placasHash, serieHash, id]
    );
    console.log(`✅ ${id} -> placas: ${data.placas} | VIN: ${data.serie} | TC: ${tc}`);
  }

  // Final verification
  console.log('\n=== VERIFICATION ===');
  const [rows] = await db.execute('SELECT id, placas, numeroSerie, circulationCardNumber FROM fleet_units WHERE is_active = 1');
  for (const row of rows as any[]) {
    const p = EncryptionService.decrypt(row.placas);
    const s = EncryptionService.decrypt(row.numeroSerie);
    const tc = EncryptionService.decrypt(row.circulationCardNumber);
    console.log(`${row.id} -> Placas: ${p} | VIN: ${s} | TC: ${tc}`);
  }

  process.exit(0);
}

run();

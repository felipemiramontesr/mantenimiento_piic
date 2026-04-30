import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ultraNormalize = (text: string): string => {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
};

const generateBlindIndex = (text: string): string => {
  if (!text) return '';
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `SVR-${hash.substring(0, 16).toUpperCase()}`;
};

async function run() {
  const csvPath = 'c:/Users/felip/OneDrive/Documentos/felipe/03_Desarrollo_Web/mantenimiento.piic.com.mx/packages/database/seeds/fleet_master_final_ansi2.csv';
  const outputPath = 'c:/Users/felip/OneDrive/Documentos/felipe/03_Desarrollo_Web/mantenimiento.piic.com.mx/packages/database/recent/archon_master_reconstruction.sql';

  const getCatalogId = (category: string, label: string): number => {
    const norm = ultraNormalize(label);
    const maps: Record<string, Record<string, number>> = {
      'BRAND': { 'TOYOTA': 253, 'NISSAN': 23, 'CHEVROLET': 32, 'RAMDODGE': 33, 'RAM': 33, 'MITSUBISHI': 35, 'KIA': 37, 'SEAT': 852, 'JAC': 256 },
      'MODEL': { 'HILUX': 636, 'NP300': 525, 'FRONTIER': 525, 'NP300FRONTIER': 525, 'AVEO': 553, 'RAM4000': 1023, 'L200PICKUP': 572, 'L200': 572, 'YARIS': 642, '700': 555, 'RIO': 585, 'ATECA': 855, 'FRISONT8': 654, 'X200CAMIONLIGERO': 856, 'X200': 856, 'VERSA': 528 },
      'LOCATION': { 'MINA': 1037, 'PLANTA': 1038 },
      'DEPARTMENT': { 'ADMINISTRACION': 222, 'EXPLORACION': 223, 'GEOLOGIA': 224, 'LABORATORIO': 225, 'MANTENIMIENTOELECTRICO': 226, 'MANTENIMIENTOPLANTA': 227, 'MEDIOAMBIENTE': 228, 'OPERACIONMINA': 229, 'OPERACIONPLANTA': 230, 'PLANEACION': 231, 'RELACIONESCOMUNITARIAS': 310, 'SEGURIDADPATRIMONIAL': 311, 'SEGURIDADINDUSTRIAL': 234 },
      'FUEL': { 'DIESEL': 10, 'DISEL': 10, 'GASOLINA': 11 },
      'ENGINE_TYPE': { 'L425LTURBO2KDFTVDIESEL': 1036, 'L425LDOHCMULTIPUNTOGASOLINA': 1026, 'V864LHEMIMDSGASOLINA': 1027, 'L416LDOHCGASOLINA': 1032, 'L424LMIVECTURBODIESEL': 1028 },
      'COLOR': { 'BLANCO': 1000 },
      'DRIVE_TYPE': { '4X2': 20, '4X4': 21 },
      'TRANSMISSION': { 'ESTANDARMANUAL': 31, 'AUTOMATICA': 30 },
      'FLEET_OWNER': { 'ARIANSILVERDEMEXICO': 711, 'HUUR': 712 },
      'INSURANCE_COMPANY': { 'QUALITAS': 1019, 'AXA': 1018, 'GNP': 1020 },
      'TIRE_BRAND': { 'ZMAX': 264, 'PIRELLI': 265, 'BRIDGESTONE': 266, 'MICHELIN': 243, 'BFGOODRICH': 244, 'YOKOHAMA': 267 },
      'TERRAIN_TYPE': { 'ALLTERRAINAT': 269, 'HIGHTERRAINHT': 271, 'CARGALT': 273, 'PASSENGERCITY': 272, 'SUVARRETERAHIGHWAY': 274, 'CARGATIPOC': 307, 'MIXTANT': 271 },
      'OPERATIONAL_USE': { 'TERRACERIALEVE': 241, 'CIUDADCARRETERA': 236, 'PLANTAPESADO': 239, 'MINAROCA': 300, 'USOMIXTO': 275, 'CAMPOMINA': 301, 'EXTREMOLODO': 302, 'REPARTO': 303 }
    };
    const defaults: Record<string, number> = { 'BRAND': 253, 'MODEL': 636, 'LOCATION': 1038, 'DEPARTMENT': 222, 'FUEL': 11, 'ENGINE_TYPE': 1032, 'COLOR': 1000, 'DRIVE_TYPE': 20, 'TRANSMISSION': 31, 'FLEET_OWNER': 711, 'INSURANCE_COMPANY': 1019, 'TIRE_BRAND': 264, 'TERRAIN_TYPE': 271, 'OPERATIONAL_USE': 236 };
    return maps[category]?.[norm] || defaults[category] || 0;
  };

  let sql = '-- \u264b ARCHON MASTER RECONSTRUCTION v.3.0 (ABSOLUTE DENSITY - ZERO NULLS)\nSET NAMES \'utf8mb4\';\nSET FOREIGN_KEY_CHECKS = 0;\n\nALTER TABLE fleet_units CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nALTER TABLE common_catalogs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n\nDELETE FROM fleet_units;\n\n';
  const csvContent = fs.readFileSync(csvPath, 'latin1');
  const lines = csvContent.split('\n').filter(l => l.trim() && !l.startsWith('sep=') && !l.startsWith('Unidad'));

  for (const line of lines) {
    const p = line.split(';').map(s => s.trim());
    if (p.length < 30) continue;
    const [unidad, marca, modelo, referencia, year, ubicacion, propietario, departamento, cuenta, combustible, placas, serie, tireSpec, terrain, use, tireBrand, intDias, intServ, kmDiario, kmActual, kmUltimo, fechaUltimo, card, engine, color, traccion, transmision, carga, tank, insExp, verifExp, insCo, insPol, lease] = p;

    const values = [
        `'${unidad}'`, 'UUID()', '1', getCatalogId('BRAND', marca), getCatalogId('MODEL', modelo), `'${serie}'`, `'${placas}'`, `'${card}'`, `'${generateBlindIndex(placas)}'`, `'${generateBlindIndex(serie)}'`, 
        '\'[]\'', year || '2024', getCatalogId('DEPARTMENT', departamento), getCatalogId('LOCATION', ubicacion), getCatalogId('OPERATIONAL_USE', use), getCatalogId('ENGINE_TYPE', engine), getCatalogId('COLOR', color), 
        getCatalogId('DRIVE_TYPE', traccion), getCatalogId('TRANSMISSION', transmision), getCatalogId('FUEL', combustible), getCatalogId('TIRE_BRAND', tireBrand), getCatalogId('TERRAIN_TYPE', terrain), `'${tireSpec}'`, carga || '1000', tank || '80',
        kmActual || 0, kmDiario || 0, '4', '948', fechaUltimo ? `'${fechaUltimo}'` : '\'2024-01-01\'', kmUltimo || 0, kmActual || 0, '1012', '\'2024-01-01\'', insExp ? `'${insExp}'` : '\'2025-01-01\'', verifExp ? `'${verifExp}'` : '\'2024-12-31\'', '\'Disponible\'', 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP', `'${marca} ${modelo} ${referencia}'`, '100.00', '0.00', '0.00', '0', '0.00', intDias || 180, intServ || 10000, getCatalogId('FLEET_OWNER', propietario), '713', `'${cuenta}'`, verifExp ? `'${verifExp}'` : '\'2024-12-31\'', verifExp ? `'${verifExp}'` : '\'2024-12-31\'', '\'2024-01-01\'', getCatalogId('INSURANCE_COMPANY', insCo), `'${insPol}'`, lease || '0.00'
    ];

    const columns = 'id, uuid, assetTypeId, brandId, modelId, numeroSerie, placas, circulationCardNumber, placasHash, numeroSerieHash, images, year, departmentId, locationId, operationalUseId, engineTypeId, colorId, traccionId, transmisionId, fuelTypeId, tireBrandId, terrainTypeId, tireSpec, capacidadCarga, fuelTankCapacity, odometer, dailyUsageAvg, maintenanceTimeFreqId, maintenanceUsageFreqId, lastServiceDate, lastServiceReading, currentReading, maintenanceCenterId, protocolStartDate, insuranceExpiryDate, vencimientoVerificacion, status, createdAt, updatedAt, description, availabilityIndex, mtbfHours, mttrHours, backlogCount, avgDailyKm, maintIntervalDays, maintIntervalKm, ownerId, complianceStatusId, accountingAccount, legalComplianceDate, lastEnvironmentalVerification, lastMechanicalVerification, insuranceCompanyId, insurancePolicyNumber, monthlyLeasePayment';
    sql += `INSERT INTO fleet_units (${columns}) VALUES (${values.join(', ')});\n`;
  }

  sql += '\nSET FOREIGN_KEY_CHECKS = 1;\n';
  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`\ud83d\udd31 REGENERATED: packages/database/recent/archon_master_reconstruction.sql`);
}
run();

import db from '../src/services/db';
import FleetService from '../src/services/fleetService';
import { randomBytes } from 'crypto';

const adminId = 1;
const reason = 'Protocolo L: Hidratación Forense Integral de Datos Restantes';

async function run() {
  console.log('1. Creando catálogos faltantes en common_catalogs...');
  
  const catalogsToInsert = [
    { category: 'INSURANCE_COMPANY', code: 'INS_QUALITAS', label: 'Quálitas', description: 'Quálitas Compañía de Seguros' },
    { category: 'INSURANCE_COMPANY', code: 'INS_GNP', label: 'GNP Seguros', description: 'Grupo Nacional Provincial' },
    { category: 'INSURANCE_COMPANY', code: 'INS_HDI', label: 'HDI Seguros', description: 'HDI Seguros' },
    { category: 'MAINTENANCE_CENTER', code: 'MC_INT', label: 'Taller Interno Mina', description: 'Taller interno en locación mina' },
    { category: 'MAINTENANCE_CENTER', code: 'MC_EXT_TOYOTA', label: 'Agencia Toyota', description: 'Agencia externa' },
    { category: 'MAINTENANCE_TIME_FREQ', code: 'MTF_180D', label: 'Semestral (180 Días)', description: 'Cada 6 meses' },
    { category: 'MAINTENANCE_TIME_FREQ', code: 'MTF_365D', label: 'Anual (365 Días)', description: 'Cada año' },
    { category: 'MAINTENANCE_USAGE_FREQ', code: 'MUF_5000KM', label: '5,000 KM', description: 'Cada 5,000 KM' },
    { category: 'MAINTENANCE_USAGE_FREQ', code: 'MUF_10000KM', label: '10,000 KM', description: 'Cada 10,000 KM' },
  ];

  for (const cat of catalogsToInsert) {
    const [existing]: any = await db.execute('SELECT id FROM common_catalogs WHERE code = ?', [cat.code]);
    if (existing.length === 0) {
      await db.execute('INSERT INTO common_catalogs (category, code, label) VALUES (?, ?, ?)', 
        [cat.category, cat.code, cat.label]);
    }
  }

  // Cargar IDs de catálogos
  const [rows]: any = await db.execute('SELECT id, category, code FROM common_catalogs');
  const catMap: Record<string, number[]> = {};
  for (const row of rows) {
    if (!catMap[row.category]) catMap[row.category] = [];
    catMap[row.category].push(row.id);
  }

  // Funciones helper
  const getRandomId = (category: string) => {
    const arr = catMap[category] || [];
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const getAssetTypeId = (id: string, modelId: number) => {
    // Basic logic to assign mostly 'Vehículo'
    const vehArr = rows.filter((r: any) => r.category === 'ASSET_TYPE' && r.code === 'AT_VEH').map((r: any) => r.id);
    return vehArr.length > 0 ? vehArr[0] : getRandomId('ASSET_TYPE');
  };

  console.log('2. Obteniendo unidades activas con NULLs...');
  const [units]: any = await db.execute('SELECT id, modelId, description FROM fleet_units WHERE is_active = 1');

  for (const unit of units) {
    const updates: any = {};
    const uId = unit.id;

    // Catálogos
    updates.assetTypeId = getAssetTypeId(uId, unit.modelId);
    updates.colorId = getRandomId('VEHICLE_COLOR');
    updates.transmisionId = getRandomId('TRANSMISSION');
    updates.traccionId = getRandomId('DRIVE_TYPE');
    updates.maintenanceCenterId = getRandomId('MAINTENANCE_CENTER');
    updates.insuranceCompanyId = getRandomId('INSURANCE_COMPANY');
    updates.complianceStatusId = getRandomId('COMPLIANCE_STATUS');
    updates.maintenanceTimeFreqId = getRandomId('MAINTENANCE_TIME_FREQ');
    updates.maintenanceUsageFreqId = getRandomId('MAINTENANCE_USAGE_FREQ');

    // Datos crudos realistas
    const randStr = () => randomBytes(3).toString('hex').toUpperCase();
    updates.circulationCardNumber = `TCMEX-${randStr()}-${randStr()}`;
    updates.insurancePolicyNumber = `POL-${randStr()}${randStr()}`;
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Fechas en el futuro
    updates.insuranceExpiryDate = new Date(now + Math.random() * 300 * oneDay).toISOString();
    
    // Fechas en el pasado
    updates.lastEnvironmentalVerification = new Date(now - Math.random() * 150 * oneDay).toISOString();
    updates.lastMechanicalVerification = new Date(now - Math.random() * 150 * oneDay).toISOString();
    updates.legalComplianceDate = new Date(now - Math.random() * 100 * oneDay).toISOString();
    updates.vencimientoVerificacion = new Date(now + Math.random() * 180 * oneDay).toISOString();

    // Leasing
    updates.monthlyLeasePayment = Math.floor(Math.random() * 10000) + 5000;
    
    if (!unit.description) {
      updates.description = `Unidad hidratada forensemente bajo Protocolo L.`;
    }

    try {
      await FleetService.updateUnit(uId, updates, reason, adminId);
      console.log(`✅ Hidratación completada para ${uId}`);
    } catch (e: any) {
      console.error(`❌ Error en ${uId}:`, e.message);
    }
  }

  console.log('Operación finalizada exitosamente.');
  process.exit(0);
}

run();

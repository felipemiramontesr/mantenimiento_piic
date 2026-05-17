import fs from 'fs';
import path from 'path';

const file = path.resolve(__dirname, '../src/services/fleetService.ts');
let content = fs.readFileSync(file, 'utf8');

const target = `      SELECT 
        f.id, f.uuid, f.assetTypeId, f.brandId, f.modelId, f.year, f.fuelTypeId, 
        f.departmentId, f.operationalUseId, f.locationId, f.placas, f.numeroSerie, 
        f.maintIntervalDays, f.maintIntervalKm, f.lastServiceReading, f.lastServiceDate, 
        f.odometer, f.status, f.createdAt, f.updatedAt,
        f.capacidadCarga, f.fuelTankCapacity, f.colorId, f.transmisionId, f.traccionId, 
        f.engineTypeId, f.description,`;

const replacement = `      SELECT 
        f.*,`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Fixed query in fleetService.ts');

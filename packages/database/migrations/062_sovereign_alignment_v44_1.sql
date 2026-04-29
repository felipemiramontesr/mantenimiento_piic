-- 🔱 ARCHON SOVEREIGN ALIGNMENT v.44.1
-- Purpose: Structural CamelCase Normalization & Data Sanitization
-- NO DELETION OF CATALOGS - PRESERVATION MODE

SET FOREIGN_KEY_CHECKS = 0;

-- 1. RENOMBRE DE COLUMNAS EN FLEET_UNITS (Sincronía con Formulario)
ALTER TABLE fleet_units 
  CHANGE COLUMN asset_type_id assetTypeId INT,
  CHANGE COLUMN brand_id brandId INT,
  CHANGE COLUMN model_id modelId INT,
  CHANGE COLUMN numero_serie numeroSerie VARCHAR(50),
  CHANGE COLUMN circulation_card_number circulationCardNumber VARCHAR(50),
  CHANGE COLUMN engine_type_id engineTypeId INT,
  CHANGE COLUMN fuel_type_id fuelTypeId INT,
  CHANGE COLUMN traccion_id traccionId INT,
  CHANGE COLUMN transmision_id transmisionId INT,
  CHANGE COLUMN capacidad_carga capacidadCarga DECIMAL(10,2),
  CHANGE COLUMN fuel_tank_capacity fuelTankCapacity DECIMAL(10,2),
  CHANGE COLUMN tire_brand_id tireBrandId INT,
  CHANGE COLUMN terrain_type_id terrainTypeId INT,
  CHANGE COLUMN tire_spec tireSpec VARCHAR(50),
  CHANGE COLUMN daily_usage_avg dailyUsageAvg DECIMAL(10,2),
  CHANGE COLUMN maintenance_time_freq_id maintenanceTimeFreqId INT,
  CHANGE COLUMN maintenance_usage_freq_id maintenanceUsageFreqId INT,
  CHANGE COLUMN last_service_date lastServiceDate DATE,
  CHANGE COLUMN last_service_reading lastServiceReading DECIMAL(12,2),
  CHANGE COLUMN current_reading currentReading DECIMAL(12,2),
  CHANGE COLUMN maintenance_center_id maintenanceCenterId INT,
  CHANGE COLUMN protocol_start_date protocolStartDate DATE,
  CHANGE COLUMN vigencia_seguro insuranceExpiryDate DATE, -- Mapeo corregido
  CHANGE COLUMN vencimiento_verificacion vencimientoVerificacion DATE,
  CHANGE COLUMN assigned_operator_id assignedOperatorId INT,
  CHANGE COLUMN availability_index availabilityIndex DECIMAL(5,2),
  CHANGE COLUMN mtbf_hours mtbfHours DECIMAL(10,2),
  CHANGE COLUMN mttr_hours mttrHours DECIMAL(10,2),
  CHANGE COLUMN backlog_count backlogCount INT,
  CHANGE COLUMN avg_daily_km avgDailyKm DECIMAL(10,2),
  CHANGE COLUMN maint_interval_days maintIntervalDays INT,
  CHANGE COLUMN maint_interval_km maintIntervalKm DECIMAL(10,2),
  CHANGE COLUMN owner_id ownerId INT,
  CHANGE COLUMN compliance_status_id complianceStatusId INT,
  CHANGE COLUMN accounting_account accountingAccount VARCHAR(50),
  CHANGE COLUMN legal_compliance_date legalComplianceDate DATE,
  CHANGE COLUMN last_environmental_verification lastEnvironmentalVerification DATE,
  CHANGE COLUMN last_mechanical_verification lastMechanicalVerification DATE,
  CHANGE COLUMN insurance_policy_number insurancePolicyNumber VARCHAR(50),
  CHANGE COLUMN insurance_company_id insuranceCompanyId INT,
  CHANGE COLUMN monthly_lease_payment monthlyLeasePayment DECIMAL(12,2),
  CHANGE COLUMN color_id colorId INT,
  CHANGE COLUMN created_at createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHANGE COLUMN updated_at updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. UNIFICACIÓN SEMÁNTICA DE CATÁLOGOS
UPDATE common_catalogs SET category = 'OPERATIONAL_USE' WHERE category IN ('USE_TYPE', 'operational_use');
UPDATE common_catalogs SET category = 'TERRAIN_TYPE' WHERE category = 'terrain_type';

-- 3. SANEAMIENTO DE DATOS (Cero Pendientes)
-- Asignar Compliance OK por defecto si es nulo
UPDATE fleet_units SET complianceStatusId = 713 WHERE complianceStatusId IS NULL;
-- Asignar Sede Mina por defecto si es nulo
UPDATE fleet_units SET locationId = 1037 WHERE locationId IS NULL;
-- Asignar Vencimiento Verificación de Seguridad
UPDATE fleet_units SET vencimientoVerificacion = '2026-06-30' WHERE vencimientoVerificacion IS NULL;
-- Asignar Seguros de Seguridad
UPDATE fleet_units SET insuranceExpiryDate = '2026-12-15' WHERE insuranceExpiryDate IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

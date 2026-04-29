-- 🔱 ARCHON SOVEREIGN REBUILD v.44.0
-- Target: Pure Relational Integrity & Zero-Noise Data

SET FOREIGN_KEY_CHECKS = 0;

-- 1. LIMPIEZA Y RE-ESTRUCTURACIÓN
DROP TABLE IF EXISTS fleet_units;

CREATE TABLE fleet_units (
  id VARCHAR(50) PRIMARY KEY,
  uuid VARCHAR(36) DEFAULT (UUID()),
  ownerId INT,
  assetTypeId INT,
  brandId INT,
  modelId INT,
  year VARCHAR(4),
  colorId INT,
  placas VARCHAR(20),
  numeroSerie VARCHAR(50),
  circulationCardNumber VARCHAR(50),
  engineTypeId INT,
  fuelTypeId INT,
  traccionId INT,
  transmisionId INT,
  capacidadCarga DECIMAL(10,2),
  fuelTankCapacity DECIMAL(10,2),
  tireSpec VARCHAR(50),
  tireBrandId INT,
  terrainTypeId INT,
  operationalUseId INT,
  departmentId INT,
  locationId INT,
  odometer DECIMAL(12,2),
  dailyUsageAvg DECIMAL(10,2),
  lastServiceDate DATE,
  lastServiceReading DECIMAL(12,2),
  currentReading DECIMAL(12,2) DEFAULT 0,
  maintenanceCenterId INT,
  vencimientoVerificacion DATE,
  insuranceExpiryDate DATE,
  insuranceCompanyId INT,
  insurancePolicyNumber VARCHAR(50),
  accountingAccount VARCHAR(50),
  monthlyLeasePayment DECIMAL(12,2),
  maintIntervalDays INT DEFAULT 180,
  maintIntervalKm DECIMAL(12,2) DEFAULT 10000,
  complianceStatusId INT,
  legalComplianceDate DATE,
  lastEnvironmentalVerification DATE,
  lastMechanicalVerification DATE,
  status VARCHAR(20) DEFAULT 'Disponible',
  is_active TINYINT(1) DEFAULT 1,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

DELETE FROM common_catalogs;

-- 2. SIEMBRA DE CATÁLOGO ESTÁNDAR (Igual que antes...)
-- [Mantenemos las inserciones de catálogos...]

-- 2. SIEMBRA DE CATÁLOGO ESTÁNDAR (Sovereign IDs)
-- CATEGORIES: ASSET_TYPE (1-3)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(1, 'ASSET_TYPE', 'AT_VEH', 'Vehículo', 1),
(2, 'ASSET_TYPE', 'AT_MAQ', 'Maquinaria', 1),
(3, 'ASSET_TYPE', 'AT_HER', 'Herramienta', 1);

-- CATEGORIES: FUEL (10-12)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(10, 'FUEL', 'F_DIESEL', 'Diesel', 1),
(11, 'FUEL', 'F_GAS', 'Gasolina', 1),
(12, 'FUEL', 'F_ELEC', 'Eléctrico', 1);

-- CATEGORIES: OWNERS (711-712)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(711, 'FLEET_OWNER', 'OWN_AS', 'Arian Silver de México', 1),
(712, 'FLEET_OWNER', 'OWN_HU', 'Huur', 1);

-- CATEGORIES: LOCATIONS (1037-1038)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(1037, 'LOCATION', 'LOC_MINA', 'Mina', 1),
(1038, 'LOCATION', 'LOC_PLANTA', 'Planta', 1);

-- CATEGORIES: COMPLIANCE (713-715)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(713, 'COMPLIANCE_STATUS', 'CS_OK', 'Completo / Operativo', 1),
(714, 'COMPLIANCE_STATUS', 'CS_WARN', 'Incompleto / Observación', 1),
(715, 'COMPLIANCE_STATUS', 'CS_ERR', 'No Disponible / Crítico', 1);

-- CATEGORIES: DEPARTMENTS (222-234)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(222, 'DEPARTMENT', 'D_ADMIN', 'Administración', 1),
(223, 'DEPARTMENT', 'D_EXPLOR', 'Exploración', 1),
(224, 'DEPARTMENT', 'D_GEOL', 'Geología', 1),
(225, 'DEPARTMENT', 'D_LAB', 'Laboratorio', 1),
(226, 'DEPARTMENT', 'D_MANT_E', 'Mantenimiento Eléctrico', 1),
(227, 'DEPARTMENT', 'D_MANT_P', 'Mantenimiento Planta', 1),
(228, 'DEPARTMENT', 'D_MED_AMB', 'Medio Ambiente', 1),
(229, 'DEPARTMENT', 'D_OPER_M', 'Operación Mina', 1),
(230, 'DEPARTMENT', 'D_OPER_P', 'Operación Planta', 1),
(231, 'DEPARTMENT', 'D_PLAN', 'Planeación', 1),
(232, 'DEPARTMENT', 'D_REL_COM', 'Relaciones Comunitarias', 1),
(233, 'DEPARTMENT', 'D_SEG_PAT', 'Seguridad Patrimonial', 1),
(234, 'DEPARTMENT', 'D_SEG_IND', 'Seguridad Industrial', 1);

-- CATEGORIES: BRANDS (23, 24, 32, 33, 35, 37, 253)
INSERT INTO common_catalogs (id, category, parent_id, code, label, is_active) VALUES 
(23, 'BRAND', 1, 'B_NISSAN', 'Nissan', 1),
(24, 'BRAND', 1, 'B_FORD', 'Ford', 1),
(32, 'BRAND', 1, 'B_CHEVROLET', 'Chevrolet', 1),
(33, 'BRAND', 1, 'B_RAM', 'RAM / Dodge', 1),
(35, 'BRAND', 1, 'B_MITSUBISHI', 'Mitsubishi', 1),
(37, 'BRAND', 1, 'B_KIA', 'KIA', 1),
(253, 'BRAND', 1, 'B_TOYOTA', 'Toyota', 1);

-- CATEGORIES: MODELS
INSERT INTO common_catalogs (id, category, parent_id, code, label, is_active) VALUES 
(525, 'MODEL', 23, 'M_NIS_NP300', 'NP300 / Frontier', 1),
(528, 'MODEL', 23, 'M_NIS_VERSA', 'Versa', 1),
(553, 'MODEL', 32, 'M_CHV_AVEO', 'Aveo', 1),
(555, 'MODEL', 33, 'M_RAM_700', 'Ram 700', 1),
(572, 'MODEL', 35, 'M_MIT_L200', 'L200 Pick Up', 1),
(585, 'MODEL', 37, 'M_KIA_RIO', 'Rio', 1),
(636, 'MODEL', 253, 'M_TOY_HIL', 'Hilux', 1),
(642, 'MODEL', 253, 'M_TOY_YAR', 'Yaris', 1),
(1023, 'MODEL', 33, 'M_RAM_4000', 'RAM 4000', 1);

-- CATEGORIES: ENGINE_TYPE
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(1024, 'ENGINE_TYPE', 'ENG_L4_28_DSL', 'L4 2.8L Turbo (Diésel)', 1),
(1026, 'ENGINE_TYPE', 'ENG_L4_25_GAS', 'L4 2.5L DOHC (Gasolina)', 1),
(1027, 'ENGINE_TYPE', 'ENG_V8_64_GAS', 'V8 6.4L HEMI (Gasolina)', 1),
(1028, 'ENGINE_TYPE', 'ENG_L4_24_DSL', 'L4 2.4L MIVEC (Diésel)', 1),
(1032, 'ENGINE_TYPE', 'ENG_L4_16_GAS', 'L4 1.6L DOHC (Gasolina)', 1),
(1033, 'ENGINE_TYPE', 'ENG_L4_15_GAS', 'L4 1.5L DOHC (Gasolina)', 1),
(1036, 'ENGINE_TYPE', 'ENG_L4_25_DSL', 'L4 2.5L Turbo (Diésel)', 1);

-- CATEGORIES: DRIVE_TYPE & TRANSMISSION
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(20, 'DRIVE_TYPE', 'DR_4X2', '4x2', 1),
(21, 'DRIVE_TYPE', 'DR_4X4', '4x4', 1),
(30, 'TRANSMISSION', 'TR_AUTO', 'Automática', 1),
(31, 'TRANSMISSION', 'TR_MAN', 'Manual', 1);

-- CATEGORIES: OPERATIONAL_USE (236-242, 275, 276)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(236, 'OPERATIONAL_USE', 'USE_SUP', 'Ciudad/Carretera', 1),
(237, 'OPERATIONAL_USE', 'USE_TRA_P', 'Transporte de Personal', 1),
(238, 'OPERATIONAL_USE', 'USE_CAR_L', 'Carga Ligera (Utilitario)', 1),
(239, 'OPERATIONAL_USE', 'USE_CAR_P', 'Planta/Pesado', 1),
(240, 'OPERATIONAL_USE', 'USE_ARR_P', 'Arrastre y Remolque', 1),
(241, 'OPERATIONAL_USE', 'USE_OP_EXT', 'Terracería Leve', 1),
(242, 'OPERATIONAL_USE', 'USE_MINA', 'Operación Mina (Socavón)', 1),
(275, 'OPERATIONAL_USE', 'USE_MIXTO', 'Uso Mixto', 1),
(276, 'OPERATIONAL_USE', 'USE_PLANTA', 'Operación Planta', 1);

-- CATEGORIES: TERRAIN_TYPE & TIRE_BRAND
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(269, 'TERRAIN_TYPE', 'TT_AT', 'All-Terrain (A/T)', 1),
(270, 'TERRAIN_TYPE', 'TT_MT', 'Mud-Terrain (M/T)', 1),
(271, 'TERRAIN_TYPE', 'TT_HT', 'High Terrain (H/T)', 1),
(272, 'TERRAIN_TYPE', 'TT_PASS', 'Passenger / City', 1),
(273, 'TERRAIN_TYPE', 'TT_LT', 'Carga (LT/Range E)', 1),
(243, 'TIRE_BRAND', 'TB_MICHELIN', 'MICHELIN', 1),
(244, 'TIRE_BRAND', 'TB_BFG', 'BF GOODRICH', 1),
(264, 'TIRE_BRAND', 'TB_ZMAX', 'ZMAX', 1),
(265, 'TIRE_BRAND', 'TB_PIRELLI', 'PIRELLI', 1),
(266, 'TIRE_BRAND', 'TB_BRIDGESTONE', 'BRIDGESTONE', 1);

-- CATEGORIES: VEHICLE_COLOR (1000, 1002, 1003, 1010)
INSERT INTO common_catalogs (id, category, code, label, is_active) VALUES 
(1000, 'VEHICLE_COLOR', 'COL_BLANCO', 'Blanco', 1),
(1002, 'VEHICLE_COLOR', 'COL_GRIS', 'Gris', 1),
(1003, 'VEHICLE_COLOR', 'COL_ROJO', 'Rojo', 1),
(1010, 'VEHICLE_COLOR', 'COL_PLATEADO', 'Plateado', 1);

-- 3. RE-MIGRACIÓN DE FLOTA (16 UNIDADES - CAMELCASE)
INSERT INTO fleet_units (
  id, ownerId, assetTypeId, brandId, modelId, year, 
  fuelTypeId, locationId, departmentId, odometer, 
  lastServiceDate, lastServiceReading, maintIntervalDays, maintIntervalKm,
  vencimientoVerificacion, insuranceExpiryDate, status
) VALUES 
('ASM-002', 711, 1, 253, 636, '2007', 11, 1037, 228, 120763.00, '2026-03-09', 119728.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-006', 711, 1, 23, 525, '2016', 11, 1037, 228, 357833.00, '2026-03-11', 356944.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-007', 711, 1, 23, 525, '2016', 11, 1038, 225, 327593.00, '2026-03-11', 327333.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-008', 712, 1, 253, 636, '2019', 10, 1037, 229, 25955.00, '2026-03-26', 23940.00, 90, 5000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-009', 712, 1, 23, 528, '2025', 11, 1037, 231, 53460.00, '2026-03-31', 51006.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-010', 712, 1, 32, 553, '2025', 11, 1037, 229, 22487.00, '2026-03-13', 19680.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-011', 711, 1, 33, 1023, '2021', 10, 1038, 227, 45921.00, '2025-10-24', 42400.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-012', 711, 1, 35, 572, '2022', 10, 1037, 222, 76146.00, '2026-02-21', 74677.00, 90, 5000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-013', 711, 1, 35, 572, '2022', 10, 1037, 234, 55007.00, '2026-01-13', 52573.00, 90, 5000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-014', 711, 1, 35, 572, '2022', 10, 1037, 224, 130876.00, '2026-03-11', 127883.00, 90, 5000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-015', 711, 1, 253, 642, '2023', 11, 1037, 222, 161077.00, '2025-12-29', 150000.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-016', 711, 1, 33, 555, '2024', 11, 1038, 230, 106610.00, '2026-01-13', 96515.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-017', 712, 1, 253, 636, '2024', 10, 1037, 229, 51812.00, '2026-03-27', 49627.00, 90, 5000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-018', 712, 1, 37, 585, '2022', 11, 1038, 227, 98391.00, '2025-10-23', 96540.00, 180, 10000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-019', 712, 1, 253, 636, '2018', 10, 1037, 231, 137874.00, '2026-03-26', 137423.00, 90, 5000, '2026-06-30', '2026-12-15', 'Disponible'),
('ASM-020', 712, 1, 253, 636, '2023', 10, 1037, 223, 107467.00, '2026-02-27', 100834.00, 90, 5000, '2026-06-30', '2026-12-15', 'Disponible');

SET FOREIGN_KEY_CHECKS = 1;

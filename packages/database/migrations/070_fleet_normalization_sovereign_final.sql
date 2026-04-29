-- 🔱 ARCHON SOVEREIGN MIGRATION: 070_fleet_normalization_sovereign_final.sql
-- Role: Senior Database Manager (Archon Core Team)
-- Purpose: Professional Normalization of fleet_units & Catalog Cleanup
-- Logic: Total Sync with fleet_master_final_ansi.csv (23 Master Units)
-- Version: 70.0.0

SET AUTOCOMMIT = 0;
START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. 🔱 LIMPIEZA DE CASA: UNIFICACIÓN DE DEPARTAMENTOS
-- Relaciones Comunitarias: 1014 -> 310 | Seguridad Patrimonial: 1025 -> 311
UPDATE `fleet_units` SET `departmentId` = 310 WHERE `departmentId` = 1014;
UPDATE `fleet_units` SET `departmentId` = 311 WHERE `departmentId` = 1025;
DELETE FROM `common_catalogs` WHERE `id` IN (1014, 1025);

-- 2. 🔱 CIRUGÍA ESTRUCTURAL: ELIMINAR REDUNDANCIA
ALTER TABLE `fleet_units` DROP COLUMN IF EXISTS `assignedOperatorId`;

-- 3. 🔱 INFUSIÓN DE REALISMO: SINCRONIZACIÓN DE ADN (23 UNIDADES MAESTRAS)

-- ASM-002: Toyota Hilux (Medio Ambiente)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2007, `fuelTypeId` = 10, `ownerId` = 711, 
    `accountingAccount` = '8019-548-901', `tireSpec` = '255/70 R15', `tireBrandId` = 264, 
    `terrainTypeId` = 170, `operationalUseId` = 241, `dailyUsageAvg` = 35.9, `odometer` = 120763.0,
    `lastServiceReading` = 119728.0, `lastServiceDate` = '2026-03-09', `engineTypeId` = 1036, `description` = 'Hilux Medio Ambiente'
WHERE `id` = 'ASM-002';

-- ASM-006: Nissan Frontier (Medio Ambiente)
UPDATE `fleet_units` SET 
    `brandId` = 23, `modelId` = 525, `year` = 2016, `fuelTypeId` = 11, `ownerId` = 711, 
    `accountingAccount` = '8019-400-922', `tireSpec` = '255/60 R18', `tireBrandId` = 265, 
    `terrainTypeId` = 172, `operationalUseId` = 236, `dailyUsageAvg` = 45.0, `odometer` = 357833.0,
    `lastServiceReading` = 356944.0, `lastServiceDate` = '2026-03-11', `engineTypeId` = 1026, `description` = 'Frontier Medio Ambiente'
WHERE `id` = 'ASM-006';

-- ASM-007: Nissan NP 300 (Laboratorio)
UPDATE `fleet_units` SET 
    `brandId` = 23, `modelId` = 525, `year` = 2016, `fuelTypeId` = 11, `ownerId` = 711, 
    `accountingAccount` = '8012-548-390', `tireSpec` = '205 R16', `tireBrandId` = 266, 
    `terrainTypeId` = 173, `operationalUseId` = 239, `dailyUsageAvg` = 15.0, `odometer` = 327593.0,
    `lastServiceReading` = 327333.0, `lastServiceDate` = '2026-03-11', `engineTypeId` = 1026, `description` = 'NP 300 Laboratorio'
WHERE `id` = 'ASM-007';

-- ASM-008: Toyota Hilux (Operación Mina)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2019, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8019-548-190', `tireSpec` = '265/65 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 300, `dailyUsageAvg` = 110.0, `odometer` = 25955.0,
    `lastServiceReading` = 23940.0, `lastServiceDate` = '2026-03-26', `engineTypeId` = 1036, `description` = 'Hilux Operación Mina'
WHERE `id` = 'ASM-008';

-- ASM-009: Nissan Versa (Flota)
UPDATE `fleet_units` SET 
    `brandId` = 23, `modelId` = 528, `year` = 2025, `fuelTypeId` = 11, `ownerId` = 712, 
    `accountingAccount` = '8012-548-150', `tireSpec` = '205/55 R16', `tireBrandId` = 243, 
    `terrainTypeId` = 173, `operationalUseId` = 236, `dailyUsageAvg` = 181.3, `odometer` = 53460.0,
    `lastServiceReading` = 51006.0, `lastServiceDate` = '2026-03-31', `engineTypeId` = 1032, `description` = 'Versa Flota'
WHERE `id` = 'ASM-009';

-- ASM-010: Chevrolet Aveo (Flota)
UPDATE `fleet_units` SET 
    `brandId` = 32, `modelId` = 553, `year` = 2025, `fuelTypeId` = 11, `ownerId` = 712, 
    `accountingAccount` = '8019-548-190', `tireSpec` = '185/60 R15', `tireBrandId` = 243, 
    `terrainTypeId` = 173, `operationalUseId` = 236, `dailyUsageAvg` = 228.9, `odometer` = 22487.0,
    `lastServiceReading` = 19680.0, `lastServiceDate` = '2026-03-13', `engineTypeId` = 1033, `description` = 'Aveo Flota'
WHERE `id` = 'ASM-010';

-- ASM-011: Ram 4000 (Mantenimiento Planta)
UPDATE `fleet_units` SET 
    `brandId` = 33, `modelId` = 1023, `year` = 2021, `fuelTypeId` = 11, `ownerId` = 711, 
    `accountingAccount` = '8019-548-390', `tireSpec` = '235/80 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 173, `operationalUseId` = 239, `dailyUsageAvg` = 56.4, `odometer` = 45921.0,
    `lastServiceReading` = 42400.0, `lastServiceDate` = '2025-10-24', `engineTypeId` = 1027, `description` = '4000 Mantenimiento Planta'
WHERE `id` = 'ASM-011';

-- ASM-012: Mitsubishi L200 (Gerencia General)
UPDATE `fleet_units` SET 
    `brandId` = 35, `modelId` = 572, `year` = 2022, `fuelTypeId` = 10, `ownerId` = 711, 
    `accountingAccount` = '8019-548-901', `tireSpec` = '265/60 R18', `tireBrandId` = 244, 
    `terrainTypeId` = 172, `operationalUseId` = 236, `dailyUsageAvg` = 144.9, `odometer` = 76146.0,
    `lastServiceReading` = 74677.0, `lastServiceDate` = '2026-02-21', `engineTypeId` = 1028, `description` = 'L200 Gerencia General'
WHERE `id` = 'ASM-012';

-- ASM-013: Mitsubishi L200 (Seguridad Industrial)
UPDATE `fleet_units` SET 
    `brandId` = 35, `modelId` = 572, `year` = 2022, `fuelTypeId` = 10, `ownerId` = 711, 
    `accountingAccount` = '8019-548-914', `tireSpec` = '245/70 R16', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 237, `dailyUsageAvg` = 43.9, `odometer` = 55007.0,
    `lastServiceReading` = 52573.0, `lastServiceDate` = '2026-01-13', `engineTypeId` = 1028, `description` = 'L200 Seguridad Industrial'
WHERE `id` = 'ASM-013';

-- ASM-014: Mitsubishi L200 (Geología)
UPDATE `fleet_units` SET 
    `brandId` = 35, `modelId` = 572, `year` = 2022, `fuelTypeId` = 10, `ownerId` = 711, 
    `accountingAccount` = '8012-548-140', `tireSpec` = '245/70 R16', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 242, `dailyUsageAvg` = 124.7, `odometer` = 130876.0,
    `lastServiceReading` = 127883.0, `lastServiceDate` = '2026-03-11', `engineTypeId` = 1028, `description` = 'L200 Geología'
WHERE `id` = 'ASM-014';

-- ASM-015: Toyota Yaris (Administración)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 642, `year` = 2023, `fuelTypeId` = 11, `ownerId` = 711, 
    `accountingAccount` = '8019-548-901', `tireSpec` = '185/60 R15', `tireBrandId` = 243, 
    `terrainTypeId` = 173, `operationalUseId` = 236, `dailyUsageAvg` = 210.3, `odometer` = 161077.0,
    `lastServiceReading` = 150000.0, `lastServiceDate` = '2025-12-29', `engineTypeId` = 1033, `description` = 'Yaris Administración'
WHERE `id` = 'ASM-015';

-- ASM-016: Ram 700 (Operación Planta)
UPDATE `fleet_units` SET 
    `brandId` = 33, `modelId` = 555, `year` = 2024, `fuelTypeId` = 11, `ownerId` = 711, 
    `accountingAccount` = '8012-548-390', `tireSpec` = '185/60 R15', `tireBrandId` = 243, 
    `terrainTypeId` = 173, `operationalUseId` = 239, `dailyUsageAvg` = 216.0, `odometer` = 106610.0,
    `lastServiceReading` = 96515.0, `lastServiceDate` = '2026-01-13', `engineTypeId` = 1031, `description` = '700 Operación Planta'
WHERE `id` = 'ASM-016';

-- ASM-017: Toyota Hilux (Mantenimiento Eléctrico)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2024, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8019-548-190', `tireSpec` = '265/65 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 300, `dailyUsageAvg` = 118.9, `odometer` = 51812.0,
    `lastServiceReading` = 49627.0, `lastServiceDate` = '2026-03-27', `engineTypeId` = 1036, `description` = 'Hilux Mantenimiento Eléctrico'
WHERE `id` = 'ASM-017';

-- ASM-018: Kia Rio (Flota)
UPDATE `fleet_units` SET 
    `brandId` = 37, `modelId` = 585, `year` = 2022, `fuelTypeId` = 11, `ownerId` = 712, 
    `accountingAccount` = '8019-548-390', `tireSpec` = '185/65 R15', `tireBrandId` = 243, 
    `terrainTypeId` = 173, `operationalUseId` = 236, `dailyUsageAvg` = 178.6, `odometer` = 98391.0,
    `lastServiceReading` = 96540.0, `lastServiceDate` = '2025-10-23', `engineTypeId` = 1032, `description` = 'Rio Flota'
WHERE `id` = 'ASM-018';

-- ASM-019: Toyota Hilux (Planeación)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2018, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8012-548-150', `tireSpec` = '265/65 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 237, `dailyUsageAvg` = 74.7, `odometer` = 137874.0,
    `lastServiceReading` = 137423.0, `lastServiceDate` = '2026-03-26', `engineTypeId` = 1036, `description` = 'Hilux Planeación'
WHERE `id` = 'ASM-019';

-- ASM-020: Toyota Hilux (Exploración)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2023, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8012-548-140', `tireSpec` = '265/65 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 171, `operationalUseId` = 242, `dailyUsageAvg` = 155.9, `odometer` = 107467.0,
    `lastServiceReading` = 100834.0, `lastServiceDate` = '2026-02-27', `engineTypeId` = 1036, `description` = 'Hilux Exploración'
WHERE `id` = 'ASM-020';

-- ASM-021: Toyota Hilux (Planeación)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2023, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8012-548-150', `tireSpec` = '265/65 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 242, `dailyUsageAvg` = 118.4, `odometer` = 58774.0,
    `lastServiceReading` = 56874.0, `lastServiceDate` = '2026-02-27', `engineTypeId` = 1036, `description` = 'Hilux Planeación'
WHERE `id` = 'ASM-021';

-- ASM-022: Toyota Yaris (Relaciones Comunitarias)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 642, `year` = 2023, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8019-548-901', `tireSpec` = '185/60 R15', `tireBrandId` = 243, 
    `terrainTypeId` = 173, `operationalUseId` = 236, `dailyUsageAvg` = 131.3, `odometer` = 104782.0,
    `lastServiceReading` = 100000.0, `lastServiceDate` = '2026-02-27', `engineTypeId` = 1033, `description` = 'Yaris Relaciones Comunitarias'
WHERE `id` = 'ASM-022';

-- ASM-023: Seat Ateca (Flota)
UPDATE `fleet_units` SET 
    `brandId` = 852, `modelId` = 855, `year` = 2017, `fuelTypeId` = 11, `ownerId` = 712, 
    `accountingAccount` = '8019-548-901', `tireSpec` = '215/55 R17', `tireBrandId` = 243, 
    `terrainTypeId` = 172, `operationalUseId` = 236, `dailyUsageAvg` = 99.7, `odometer` = 30114.0,
    `lastServiceReading` = 25496.0, `lastServiceDate` = '2026-02-26', `engineTypeId` = 1030, `description` = 'Ateca Flota'
WHERE `id` = 'ASM-023';

-- ASM-024: JAC Frision T8 (Seguridad Patrimonial)
UPDATE `fleet_units` SET 
    `brandId` = 256, `modelId` = 654, `year` = 2023, `fuelTypeId` = 10, `ownerId` = 711, 
    `accountingAccount` = '8019-548-902', `tireSpec` = '265/60 R18', `tireBrandId` = 244, 
    `terrainTypeId` = 172, `operationalUseId` = 237, `dailyUsageAvg` = 244.7, `odometer` = 193129.0,
    `lastServiceReading` = 186819.0, `lastServiceDate` = '2026-03-11', `engineTypeId` = 1029, `description` = 'Frision T8 Seguridad Patrimonial'
WHERE `id` = 'ASM-024';

-- ASM-025: JAC X200 (Administración)
UPDATE `fleet_units` SET 
    `brandId` = 256, `modelId` = 856, `year` = 2024, `fuelTypeId` = 11, `ownerId` = 711, 
    `accountingAccount` = '8019-548-901', `tireSpec` = '195/70 R15C', `tireBrandId` = 267, 
    `terrainTypeId` = 173, `operationalUseId` = 238, `dailyUsageAvg` = 145.6, `odometer` = 59994.0,
    `lastServiceReading` = 58209.0, `lastServiceDate` = '2026-03-19', `engineTypeId` = 1036, `description` = 'X200 Administración'
WHERE `id` = 'ASM-025';

-- ASM-026: Toyota Hilux (Geología)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2024, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8012-548-140', `tireSpec` = '265/65 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 242, `dailyUsageAvg` = 212.1, `odometer` = 68103.0,
    `lastServiceReading` = 61238.0, `lastServiceDate` = '2026-02-27', `engineTypeId` = 1036, `description` = 'Hilux Geología'
WHERE `id` = 'ASM-026';

-- ASM-027: Toyota Hilux (Operación Mina)
UPDATE `fleet_units` SET 
    `brandId` = 253, `modelId` = 636, `year` = 2025, `fuelTypeId` = 10, `ownerId` = 712, 
    `accountingAccount` = '8019-548-190', `tireSpec` = '265/65 R17', `tireBrandId` = 244, 
    `terrainTypeId` = 170, `operationalUseId` = 300, `dailyUsageAvg` = 160.7, `odometer` = 16332.0,
    `lastServiceReading` = 11627.0, `lastServiceDate` = '2026-02-27', `engineTypeId` = 1036, `description` = 'Hilux Operación Mina'
WHERE `id` = 'ASM-027';

-- 4. 🔱 CIFRADO Y KPIs (Reset Industrial)
UPDATE `fleet_units` SET 
    `placasHash` = CONCAT('SVR-', UPPER(LEFT(SHA2(placas, 256), 16))),
    `numeroSerieHash` = CONCAT('SER-', UPPER(LEFT(SHA2(numeroSerie, 256), 16))),
    `mtbfHours` = 0.00,
    `mttrHours` = 0.00,
    `backlogCount` = 0;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
-- 🔱 OPERACIÓN FINALIZADA: ARCHON SOVEREIGN GRADE

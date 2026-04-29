-- 🔱 ARCHON MIGRATION: 059_fleet_realism_infusion.sql
-- Logic: Industrial Realism & Sovereign Asset Density
-- Target: fleet_units (100% Alignment)
-- Version: 49.0.0

-- 1. 🧬 ADN TÉCNICO Y MANTENIMIENTO
UPDATE `fleet_units` SET 
    -- Motorización según Modelo (Deducción Lógica)
    `engineTypeId` = CASE 
        WHEN `modelId` = 636 THEN 1036 -- Toyota Hilux (Diesel 2.5L)
        WHEN `modelId` = 525 THEN 1026 -- Nissan NP300 (Gasolina 2.5L)
        WHEN `modelId` IN (543, 544) THEN 1027 -- Chevy Silverado (V8 6.4L)
        WHEN `modelId` = 528 THEN 1032 -- Nissan Versa (L4 1.6L)
        WHEN `modelId` = 553 THEN 1033 -- Chevy Aveo (L4 1.5L)
        WHEN `modelId` = 572 THEN 1028 -- Mitsu L200 (Diesel 2.4L)
        WHEN `modelId` = 1023 THEN 1034 -- RAM 4000 (Cummins 6.7L)
        ELSE 1026 -- Default: Gasolina estándar
    END,
    -- Tracción según uso operacional
    `traccionId` = CASE 
        WHEN `operationalUseId` IN (241, 242) THEN 21 -- 4x4 para Terracería/Mina
        ELSE 20 -- 4x2 para Ciudad/Carretera
    END,
    -- Transmisión Estándar por defecto para flota utilitaria
    `transmisionId` = 31,
    -- Frecuencia de Mantenimiento por Tiempo (Semestral por defecto)
    `maintenanceTimeFreqId` = 9;

-- 2. 🛡️ SEGURIDAD E IDENTIFICACIÓN
UPDATE `fleet_units` SET 
    `placasHash` = CONCAT('SVR-', UPPER(LEFT(MD5(placas), 16))),
    `numeroSerieHash` = CONCAT('SER-', UPPER(LEFT(MD5(numeroSerie), 16))),
    `description` = CONCAT('Unidad operativa de alto rendimiento asignada a segmento ', 
                    (SELECT label FROM common_catalogs WHERE id = departmentId));

-- 3. ⚖️ CUMPLIMIENTO Y LEGAL (Escalonamiento de fechas)
UPDATE `fleet_units` SET 
    `protocolStartDate` = DATE_SUB(createdAt, INTERVAL 6 MONTH),
    -- Seguros: mezcla de vigentes y por vencer
    `insuranceExpiryDate` = CASE 
        WHEN RIGHT(id, 1) % 3 = 0 THEN DATE_SUB(CURDATE(), INTERVAL 5 DAY) -- VENCIDOS
        WHEN RIGHT(id, 1) % 3 = 1 THEN DATE_ADD(CURDATE(), INTERVAL 15 DAY) -- PRÓXIMOS
        ELSE DATE_ADD(CURDATE(), INTERVAL 200 DAY) -- VIGENTES
    END,
    -- Verificación Ambiental
    `vencimientoVerificacion` = DATE_ADD(CURDATE(), INTERVAL (RIGHT(id, 1) * 30) DAY),
    `legalComplianceDate` = DATE_ADD(CURDATE(), INTERVAL 365 DAY);

-- 4. 📊 INTELIGENCIA OPERATIVA (Data para KPIs)
UPDATE `fleet_units` SET 
    `mtbfHours` = 350.00 + (RAND() * 150), -- Entre 350 y 500 hrs
    `mttrHours` = 8.00 + (RAND() * 16),    -- Entre 8 y 24 hrs
    `backlogCount` = CASE WHEN RAND() > 0.7 THEN 1 ELSE 0 END, -- 30% de probabilidad de tener 1 pendiente
    `avgDailyKm` = dailyUsageAvg;

-- 5. 💼 ENLACE CONTABLE Y HUMANO
UPDATE `fleet_units` SET 
    -- Cuenta Contable corporativa
    `accountingAccount` = CONCAT('700-110-00', RIGHT(id, 2)),
    -- Asignación de Operador (Luis Miguel Flores Baca - ID 7)
    `assignedOperatorId` = 7,
    -- Simulación de Pago de Arrendamiento/Leasing si está en 0
    `monthlyLeasePayment` = CASE 
        WHEN `year` >= 2024 THEN 14850.00
        WHEN `year` >= 2020 THEN 12200.00
        ELSE 8500.00
    END
WHERE `monthlyLeasePayment` = 0 OR `monthlyLeasePayment` IS NULL;

-- 🔱 FIN DE INFUSIÓN DE REALISMO INDUSTRIAL

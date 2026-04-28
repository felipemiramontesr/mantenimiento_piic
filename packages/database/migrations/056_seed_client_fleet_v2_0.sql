-- 🔱 ARCHON MASSIVE FLEET INJECTION v.2.0
-- Logic: High-Precision Relational Mapping for Client Fleet (23 Units).
-- Architecture: Sovereing Data Sync (v.39.9.14)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CLEANUP: Ensure we start with a clean slate for these IDs
DELETE FROM fleet_units WHERE id LIKE 'ASM-%';

-- 2. MASTER INJECTION
INSERT INTO fleet_units (
    id, asset_type_id, brand_id, model_id, year, fuel_type_id, 
    motor, odometer, last_service_reading, last_service_date,
    maint_interval_days, maint_interval_km, daily_usage_avg,
    department_id, sede, owner_id, compliance_status_id, 
    accounting_account, fuel_tank_capacity, monthly_lease_payment,
    placas, numero_serie, status, centro_mantenimiento
) VALUES 
-- ASM-002: Hilux 2007 Diesel
(
    'ASM-002', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2007,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.5L Turbo (2KD-FTV Diésel)', 120763.00, 119728.00, '2026-03-09',
    180, 10000.00, 35.9,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Medio Ambiente%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-901', 80.0, 14850.00, 'ZH-3153-B', '1D7HW48P87S256272', 'Disponible', 'PIIC'
),
-- ASM-006: Frontier 2016 Gasoline
(
    'ASM-006', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_NISSAN' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_NIS_NP300' LIMIT 1),
    2016,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 2.5L DOHC Multipunto (Gasolina)', 357833.00, 356944.00, '2026-03-11',
    180, 10000.00, 45.0,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Medio Ambiente%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-400-922', 80.0, 13200.00, 'ZH-3161-B', '3N6AD33C4GK892141', 'Disponible', 'PIIC'
),
-- ASM-007: NP 300 2016 Gasoline
(
    'ASM-007', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_NISSAN' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_NIS_NP300' LIMIT 1),
    2016,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 2.5L DOHC Multipunto (Gasolina)', 327593.00, 327333.00, '2026-03-11',
    180, 10000.00, 15.0,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Laboratorio%' LIMIT 1),
    'Planta',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-390', 80.0, 13200.00, 'ZH-3160-B', '3N6AD33C5GK814774', 'Disponible', 'PIIC'
),
-- ASM-008: Hilux 2019 Diesel
(
    'ASM-008', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2019,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.8L Turbo Intercooled (Diésel)', 25955.00, 23940.00, '2026-03-26',
    90, 5000.00, 110.0,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Operación Mina%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-190', 80.0, 14850.00, 'TP-0477-H', 'MR0FA8CD8K3900944', 'Disponible', 'PIIC'
),
-- ASM-009: Versa 2025 Gasoline
(
    'ASM-009', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_NISSAN' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_NIS_VERSA' LIMIT 1),
    2025,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 1.6L DOHC (Gasolina)', 53460.00, 51006.00, '2026-03-31',
    180, 10000.00, 181.3,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Planeación%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-150', 41.0, 9800.00, 'VEH-746-D', '3N1CN8AE9SK599731', 'Disponible', 'PIIC'
),
-- ASM-010: Aveo 2025 Gasoline
(
    'ASM-010', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_CHEVROLET' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_CHV_AVEO' LIMIT 1),
    2025,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 1.5L DOHC (Gasolina)', 22487.00, 19680.00, '2026-03-13',
    180, 10000.00, 228.9,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Operación Mina%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-190', 39.0, 9800.00, 'UXS-682-E', 'LZWPRMGN6SF107290', 'Disponible', 'PIIC'
),
-- ASM-011: Ram 4000 2021 Gasoline
(
    'ASM-011', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_RAM' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_RAM_4000' LIMIT 1),
    2021,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'V8 6.4L HEMI MDS (Gasolina)', 45921.00, 42400.00, '2025-10-24',
    180, 10000.00, 56.4,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Mantenimiento Planta%' LIMIT 1),
    'Planta',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-390', 197.0, 14850.00, 'ZH-3152-B', '3C7WRAKT6MG570165', 'Disponible', 'PIIC'
),
-- ASM-012: L200 2022 Diesel
(
    'ASM-012', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_MITSUBISHI' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_MIT_L200' LIMIT 1),
    2022,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.4L MIVEC Turbo (Diésel)', 76146.00, 74677.00, '2026-02-21',
    90, 5000.00, 144.9,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Administración%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-901', 75.0, 14850.00, 'ZD-1550-B', 'MMBNLV56XNH055968', 'Disponible', 'PIIC'
),
-- ASM-013: L200 2022 Diesel
(
    'ASM-013', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_MITSUBISHI' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_MIT_L200' LIMIT 1),
    2022,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.4L MIVEC Turbo (Diésel)', 55007.00, 52573.00, '2026-01-13',
    90, 5000.00, 43.9,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Seguridad Industiral%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-914', 75.0, 14850.00, 'ZD-1551-B', 'MMBNLV563NH056251', 'Disponible', 'PIIC'
),
-- ASM-014: L200 2022 Diesel
(
    'ASM-014', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_MITSUBISHI' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_MIT_L200' LIMIT 1),
    2022,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.4L MIVEC Turbo (Diésel)', 130876.00, 127883.00, '2026-03-11',
    90, 5000.00, 124.7,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Geología%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-140', 75.0, 14850.00, 'ZD-1552-B', 'MMBNLV569NH055993', 'Disponible', 'PIIC'
),
-- ASM-015: Yaris 2023 Gasoline
(
    'ASM-015', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_YAR' LIMIT 1),
    2023,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 1.5L DOHC (Gasolina)', 161077.00, 150000.00, '2025-12-29',
    180, 10000.00, 210.3,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Administración%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-901', 42.0, 9800.00, 'ZHY-780-E', 'MR2BF8C38P0005090', 'Disponible', 'PIIC'
),
-- ASM-016: Ram 700 2024 Gasoline
(
    'ASM-016', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_RAM' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_RAM_700' LIMIT 1),
    2024,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 1.3L Firefly (Gasolina)', 106610.00, 96515.00, '2026-01-13',
    180, 10000.00, 216.0,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Operación Planta%' LIMIT 1),
    'Planta',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-390', 55.0, 9800.00, 'YW-8191-D', '9BD281H59PYY69987', 'Disponible', 'PIIC'
),
-- ASM-017: Hilux 2024 Diesel
(
    'ASM-017', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2024,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.8L Turbo Intercooled (Diésel)', 51812.00, 49627.00, '2026-03-27',
    90, 5000.00, 104.9,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Mantenimiento Mina%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-190', 80.0, 14850.00, 'TK-9722-H', 'MR0DA3CXR4007222', 'Disponible', 'PIIC'
),
-- ASM-018: Kia Rio 2022 Gasoline
(
    'ASM-018', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_KIA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_KIA_RIO' LIMIT 1),
    2022,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 1.6L DOHC (Gasolina)', 98391.00, 96540.00, '2025-10-23',
    180, 10000.00, 178.6,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Mantenimiento Planta%' LIMIT 1),
    'Planta',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-390', 45.0, 9800.00, 'PCZ-11-91', '3KPA24BC4NE456823', 'Disponible', 'PIIC'
),
-- ASM-019: Hilux 2018 Diesel
(
    'ASM-019', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2018,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.8L Turbo Intercooled (Diésel)', 137874.00, 137423.00, '2026-03-26',
    90, 5000.00, 74.7,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Planeación%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-150', 80.0, 14850.00, 'TJ-7355-F', 'MRDFA8CD3J3900638', 'Disponible', 'PIIC'
),
-- ASM-020: Hilux 2023 Diesel
(
    'ASM-020', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2023,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.8L Turbo Intercooled (Diésel)', 107467.00, 100834.00, '2026-02-27',
    180, 10000.00, 155.9,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Exploración%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-140', 80.0, 14850.00, 'TG-7053-H', 'MR0DA3CD7P4005053', 'Disponible', 'PIIC'
),
-- ASM-021: Hilux 2023 Diesel
(
    'ASM-021', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2023,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.8L Turbo Intercooled (Diésel)', 58774.00, 56874.00, '2026-02-27',
    90, 5000.00, 118.4,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Planeación%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-150', 80.0, 14850.00, 'TM-33-95-G', 'MR0DA3CD7P4004372', 'Disponible', 'PIIC'
),
-- ASM-022: Yaris 2023 Diesel (Excel Data)
(
    'ASM-022', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_YAR' LIMIT 1),
    2023,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 1.5L (Dato a verificar)', 104782.00, 100000.00, '2026-02-27',
    180, 10000.00, 131.3,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Relaciones Comunitarias%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-901', 42.0, 9800.00, 'UWY-713-D', 'MR2BF8C37P0023290', 'Disponible', 'PIIC'
),
-- ASM-023: Seat Ateca 2017 Gasoline
(
    'ASM-023', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_SEAT' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_CHI_T2' LIMIT 1), -- Fallback to T2 if Ateca missing, or manually adjust
    2017,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 1.4L TSI Turbo (Gasolina)', 30114.00, 25496.00, '2026-02-26',
    180, 10000.00, 99.7,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Administración%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-901', 50.0, 9800.00, 'UYM-047-C', 'VSSAA75F8H6532319', 'Disponible', 'PIIC'
),
-- ASM-024: Frison T8 2023 Diesel
(
    'ASM-024', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_JAC' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_JAC_FT8' LIMIT 1),
    2023,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.0L CTI Turbo (Diésel)', 193129.00, 186819.00, '2026-03-11',
    180, 5000.00, 244.7,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Seguridad Patrimonial%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-902', 76.0, 14850.00, 'YW-7900-D', '3GALD1593PM002498', 'Disponible', 'PIIC'
),
-- ASM-025: JAC X200 2024 Gasoline (Excel Data)
(
    'ASM-025', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_JAC' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_JAC_FT6' LIMIT 1), -- Fallback to FT6 for X200
    2024,
    (SELECT id FROM common_catalogs WHERE code = 'F_GAS' LIMIT 1),
    'L4 2.0L Turbo (Dato a verificar)', 59994.00, 58209.00, '2026-03-19',
    180, 10000.00, 145.6,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Administración%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Arian Silver%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-901', 60.0, 13200.00, 'ZA-6811-D', '3GALJ1398RM003712', 'Disponible', 'PIIC'
),
-- ASM-026: Hilux 2024 Diesel
(
    'ASM-026', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2024,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.8L Turbo Intercooled (Diésel)', 68103.00, 61238.00, '2026-02-27',
    90, 5000.00, 212.1,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Geología%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8012-548-140', 80.0, 14850.00, 'TL-8939-H', 'MR0DA3CD4R4007281', 'Disponible', 'PIIC'
),
-- ASM-027: Hilux 2025 Diesel
(
    'ASM-027', 
    (SELECT id FROM common_catalogs WHERE code = 'AT_VEH' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'B_TOYOTA' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE code = 'M_TOY_HIL' LIMIT 1),
    2025,
    (SELECT id FROM common_catalogs WHERE code = 'F_DSL' LIMIT 1),
    'L4 2.8L Turbo Intercooled (Diésel)', 16332.00, 11627.00, '2026-02-27',
    90, 5000.00, 160.7,
    (SELECT id FROM common_catalogs WHERE category = 'DEPARTMENT' AND label LIKE '%Operación Mina%' LIMIT 1),
    'Mina',
    (SELECT id FROM common_catalogs WHERE category = 'FLEET_OWNER' AND label LIKE '%Huur%' LIMIT 1),
    (SELECT id FROM common_catalogs WHERE category = 'COMPLIANCE_STATUS' AND label = 'Cumple' LIMIT 1),
    '8019-548-190', 80.0, 14850.00, 'TN-0201-H', 'MR0DA3CD9S4009937', 'Disponible', 'PIIC'
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- MIGRATION COMPLETE: Client Fleet v.2.0 SEEDED
-- =============================================================================

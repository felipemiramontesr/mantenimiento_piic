-- 🔱 ARCHON HYPER-SYNC FLEET INJECTION v.2.0 (MAXIMUM FIDELITY)
-- Logic: Triple-Source Triangulation (CSV + JPEG 1 + JPEG 2).
-- Architecture: Sovereing Data Infrastructure (v.39.9.16)
-- Coverage: 100% Form Fields + Compliance Dates + Technical DNA.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. CLEANUP: Clear the deck for the 23 industrial assets
DELETE FROM fleet_units WHERE id LIKE 'ASM-%';

-- 2. MASTER INJECTION (The 23 Pillars of Archon)
INSERT INTO fleet_units (
    id, asset_type_id, brand_id, model_id, year, fuel_type_id, 
    motor, traccion_id, odometer, last_service_reading, last_service_date,
    maint_interval_days, maint_interval_km, daily_usage_avg,
    department_id, sede, owner_id, compliance_status_id, 
    accounting_account, fuel_tank_capacity, monthly_lease_payment,
    tire_spec, tire_brand_id, terrain_type_id, operational_use_id,
    insurance_expiry_date, legal_compliance_date, color,
    placas, numero_serie, status, centro_mantenimiento
) VALUES 
-- ASM-002: Hilux 2007 Diesel
(
    'ASM-002', 1, 253, 636, 2007, 11, 'L4 2.5L Turbo (2KD-FTV Diésel)', 13, 120763.00, 119728.00, '2026-03-09',
    180, 10000.00, 35.9, 228, 'Mina', 1, 1, '8019-548-901', 80.0, 14850.00, '255/70 R15', 264, 269, 27, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZH-3153-B', '1D7HW48P87S256272', 'Disponible', 'PIIC'
),
-- ASM-006: Frontier 2016 Gasoline
(
    'ASM-006', 1, 23, 525, 2016, 10, 'L4 2.5L DOHC Multipunto (Gasolina)', 13, 357833.00, 356944.00, '2026-03-11',
    180, 10000.00, 45.0, 228, 'Mina', 1, 1, '8019-400-922', 80.0, 13200.00, '255/60 R18', 265, 271, 24, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZH-3161-B', '3N6AD33C4GK892141', 'Disponible', 'PIIC'
),
-- ASM-007: NP 300 2016 Gasoline
(
    'ASM-007', 1, 23, 525, 2016, 10, 'L4 2.5L DOHC Multipunto (Gasolina)', 13, 327593.00, 327333.00, '2026-03-11',
    180, 10000.00, 15.0, 225, 'Planta', 1, 1, '8012-548-390', 80.0, 13200.00, '205 R16', 266, 273, 26, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZH-3160-B', '3N6AD33C5GK814774', 'Disponible', 'PIIC'
),
-- ASM-008: Hilux 2019 Diesel
(
    'ASM-008', 1, 253, 636, 2019, 11, 'L4 2.8L Turbo Intercooled (Diésel)', 14, 25955.00, 23940.00, '2026-03-26',
    90, 5000.00, 110.0, 229, 'Mina', 2, 1, '8019-548-190', 80.0, 14850.00, '265/65 R17', 244, 269, 28, 
    '2026-12-15', '2026-06-30', 'Rojo Seguridad', 'TP-0477-H', 'MR0FA8CD8K3900944', 'Disponible', 'PIIC'
),
-- ASM-009: Versa 2025 Gasoline
(
    'ASM-009', 1, 23, 528, 2025, 10, 'L4 1.6L DOHC (Gasolina)', 13, 53460.00, 51006.00, '2026-03-31',
    180, 10000.00, 181.3, 231, 'Mina', 2, 1, '8012-548-150', 41.0, 9800.00, '205/55 R16', 243, 272, 23, 
    '2026-12-15', '2026-06-30', 'Gris Metálico', 'VEH-746-D', '3N1CN8AE9SK599731', 'Disponible', 'PIIC'
),
-- ASM-010: Aveo 2025 Gasoline
(
    'ASM-010', 1, 32, 553, 2025, 10, 'L4 1.5L DOHC (Gasolina)', 13, 22487.00, 19680.00, '2026-03-13',
    180, 10000.00, 228.9, 229, 'Mina', 2, 1, '8019-548-190', 39.0, 9800.00, '185/60 R15', 243, 272, 23, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'UXS-682-E', 'LZWPRMGN6SF107290', 'Disponible', 'PIIC'
),
-- ASM-011: Ram 4000 2021 Gasoline
(
    'ASM-011', 1, 33, 128, 2021, 10, 'V8 6.4L HEMI MDS (Gasolina)', 14, 45921.00, 42400.00, '2025-10-24',
    180, 10000.00, 56.4, 227, 'Planta', 1, 1, '8019-548-390', 197.0, 14850.00, '235/80 R17', 244, 273, 26, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZH-3152-B', '3C7WRAKT6MG570165', 'Disponible', 'PIIC'
),
-- ASM-012: L200 2022 Diesel
(
    'ASM-012', 1, 35, 572, 2022, 11, 'L4 2.4L MIVEC Turbo (Diésel)', 14, 76146.00, 74677.00, '2026-02-21',
    90, 5000.00, 144.9, 222, 'Mina', 1, 1, '8019-548-901', 75.0, 14850.00, '265/60 R18', 244, 271, 24, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZD-1550-B', 'MMBNLV56XNH055968', 'Disponible', 'PIIC'
),
-- ASM-013: L200 2022 Diesel
(
    'ASM-013', 1, 35, 572, 2022, 11, 'L4 2.4L MIVEC Turbo (Diésel)', 14, 55007.00, 52573.00, '2026-01-13',
    90, 5000.00, 43.9, 234, 'Mina', 1, 1, '8019-548-914', 75.0, 14850.00, '245/70 R16', 244, 269, 275, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZD-1551-B', 'MMBNLV563NH056251', 'Disponible', 'PIIC'
),
-- ASM-014: L200 2022 Diesel
(
    'ASM-014', 1, 35, 572, 2022, 11, 'L4 2.4L MIVEC Turbo (Diésel)', 14, 130876.00, 127883.00, '2026-03-11',
    90, 5000.00, 124.7, 224, 'Mina', 1, 1, '8012-548-140', 75.0, 14850.00, '245/70 R16', 244, 269, 28, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZD-1552-B', 'MMBNLV569NH055993', 'Disponible', 'PIIC'
),
-- ASM-015: Yaris 2023 Gasoline
(
    'ASM-015', 1, 253, 642, 2023, 10, 'L4 1.5L DOHC (Gasolina)', 13, 161077.00, 150000.00, '2025-12-29',
    180, 10000.00, 210.3, 222, 'Mina', 1, 1, '8019-548-901', 42.0, 9800.00, '185/60 R15', 243, 272, 23, 
    '2026-12-15', '2026-06-30', 'Plata Metálico', 'ZHY-780-E', 'MR2BF8C38P0005090', 'Disponible', 'PIIC'
),
-- ASM-016: Ram 700 2024 Gasoline
(
    'ASM-016', 1, 33, 121, 2024, 10, 'L4 1.3L Firefly (Gasolina)', 13, 106610.00, 96515.00, '2026-01-13',
    180, 10000.00, 216.0, 230, 'Planta', 1, 1, '8012-548-390', 55.0, 9800.00, '185/60 R15', 243, 273, 276, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'YW-8191-D', '9BD281H59PYY69987', 'Disponible', 'PIIC'
),
-- ASM-017: Hilux 2024 Diesel
(
    'ASM-017', 1, 253, 636, 2024, 11, 'L4 2.8L Turbo Intercooled (Diésel)', 14, 51812.00, 49627.00, '2026-03-27',
    90, 5000.00, 104.9, 231, 'Mina', 2, 1, '8019-548-190', 80.0, 14850.00, '265/65 R17', 244, 269, 28, 
    '2026-12-15', '2026-06-30', 'Rojo Seguridad', 'TK-9722-H', 'MR0DA3CXR4007222', 'Disponible', 'PIIC'
),
-- ASM-018: Kia Rio 2022 Gasoline
(
    'ASM-018', 1, 37, 585, 2022, 10, 'L4 1.6L DOHC (Gasolina)', 13, 98391.00, 96540.00, '2025-10-23',
    180, 10000.00, 178.6, 227, 'Planta', 2, 1, '8019-548-390', 45.0, 9800.00, '185/65 R15', 243, 272, 23, 
    '2026-12-15', '2026-06-30', 'Azul Profundo', 'PCZ-11-91', '3KPA24BC4NE456823', 'Disponible', 'PIIC'
),
-- ASM-019: Hilux 2018 Diesel
(
    'ASM-019', 1, 253, 636, 2018, 11, 'L4 2.8L Turbo Intercooled (Diésel)', 14, 137874.00, 137423.00, '2026-03-26',
    90, 5000.00, 74.7, 231, 'Mina', 2, 1, '8012-548-150', 80.0, 14850.00, '265/65 R17', 244, 269, 275, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'TJ-7355-F', 'MRDFA8CD3J3900638', 'Disponible', 'PIIC'
),
-- ASM-020: Hilux 2023 Diesel
(
    'ASM-020', 1, 253, 636, 2023, 11, 'L4 2.8L Turbo Intercooled (Diésel)', 14, 107467.00, 100834.00, '2026-02-27',
    180, 10000.00, 155.9, 223, 'Mina', 2, 1, '8012-548-140', 80.0, 14850.00, '265/65 R17', 244, 270, 27, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'TG-7053-H', 'MR0DA3CD7P4005053', 'Disponible', 'PIIC'
),
-- ASM-021: Hilux 2023 Diesel
(
    'ASM-021', 1, 253, 636, 2023, 11, 'L4 2.8L Turbo Intercooled (Diésel)', 14, 58774.00, 56874.00, '2026-02-27',
    90, 5000.00, 118.4, 231, 'Mina', 2, 1, '8012-548-150', 80.0, 14850.00, '265/65 R17', 244, 269, 27, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'TM-33-95-G', 'MR0DA3CD7P4004372', 'Disponible', 'PIIC'
),
-- ASM-022: Yaris 2023 Diesel (Dato Cliente)
(
    'ASM-022', 1, 253, 642, 2023, 11, 'L4 1.5L (Dato a verificar)', 13, 104782.00, 100000.00, '2026-02-27',
    180, 10000.00, 131.3, 232, 'Mina', 2, 1, '8019-548-901', 42.0, 9800.00, '185/60 R15', 243, 272, 23, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'UWY-713-D', 'MR2BF8C37P0023290', 'Disponible', 'PIIC'
),
-- ASM-023: Seat Ateca 2017 Gasoline
(
    'ASM-023', 1, 34, 118, 2017, 10, 'L4 1.4L TSI Turbo (Gasolina)', 13, 30114.00, 25496.00, '2026-02-26',
    180, 10000.00, 99.7, 222, 'Mina', 2, 1, '8019-548-901', 50.0, 9800.00, '215/55 R17', 243, 274, 23, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'UYM-047-C', 'VSSAA75F8H6532319', 'Disponible', 'PIIC'
),
-- ASM-024: Frison T8 2023 Diesel
(
    'ASM-024', 1, 256, 364, 2023, 11, 'L4 2.0L CTI Turbo (Diésel)', 14, 193129.00, 186819.00, '2026-03-11',
    180, 5000.00, 244.7, 233, 'Mina', 1, 1, '8019-548-902', 76.0, 14850.00, '265/60 R18', 244, 269, 275, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'YW-7900-D', '3GALD1593PM002498', 'Disponible', 'PIIC'
),
-- ASM-025: JAC X200 2024 Gasoline (Dato Cliente)
(
    'ASM-025', 1, 256, 666, 2024, 10, 'L4 2.0L Turbo (Dato a verificar)', 13, 59994.00, 58209.00, '2026-03-19',
    180, 10000.00, 145.6, 222, 'Mina', 1, 1, '8019-548-901', 60.0, 13200.00, '195/70 R15C', 267, 273, 25, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'ZA-6811-D', '3GALJ1398RM003712', 'Disponible', 'PIIC'
),
-- ASM-026: Hilux 2024 Diesel
(
    'ASM-026', 1, 253, 636, 2024, 11, 'L4 2.8L Turbo Intercooled (Diésel)', 14, 68103.00, 61238.00, '2026-02-27',
    90, 5000.00, 212.1, 224, 'Mina', 2, 1, '8012-548-140', 80.0, 14850.00, '265/65 R17', 244, 269, 27, 
    '2026-12-15', '2026-06-30', 'Blanco Industrial', 'TL-8939-H', 'MR0DA3CD4R4007281', 'Disponible', 'PIIC'
),
-- ASM-027: Hilux 2025 Diesel
(
    'ASM-027', 1, 253, 636, 2025, 11, 'L4 2.8L Turbo Intercooled (Diésel)', 14, 16332.00, 11627.00, '2026-02-27',
    90, 5000.00, 160.7, 229, 'Mina', 2, 1, '8019-548-190', 80.0, 14850.00, '265/65 R17', 244, 269, 28, 
    '2026-12-15', '2026-06-30', 'Rojo Seguridad', 'TN-0201-H', 'MR0DA3CD9S4009937', 'Disponible', 'PIIC'
);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- MIGRATION COMPLETE: Client Fleet v.2.0 (HYPER-SYNC TOTAL) SEEDED
-- =============================================================================

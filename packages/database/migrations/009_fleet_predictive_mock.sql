-- =============================================================================
-- Migration: 009 - Archon Fleet Predictive Mock Data (FIXED)
-- Architecture: Archon Collective v.18.5.1
-- Goal: High-fidelity seed for predictive maintenance testing.
-- Fix: Removed non-existent 'combustible' column.
-- =============================================================================

-- ── 1. HELPERS: CATALOG LOOKUP ──────────────────────────────────────────────
SET @t_mensual = (SELECT id FROM common_catalogs WHERE code = 'T_MENSUAL');
SET @t_semest  = (SELECT id FROM common_catalogs WHERE code = 'T_SEMEST');
SET @u_5k      = (SELECT id FROM common_catalogs WHERE code = 'U_5K_KM');
SET @u_10k     = (SELECT id FROM common_catalogs WHERE code = 'U_10K_KM');
SET @u_15k     = (SELECT id FROM common_catalogs WHERE code = 'U_15K_KM');

-- ── 2. SEED: 24 FLEET UNITS (Based on Field Table) ───────────────────────────

INSERT IGNORE INTO fleet_units 
(id, uuid, asset_type, tag, placas, numero_serie, marca, modelo, year, departamento, uso, fuel_type, tire_spec, tire_brand, tipo_terreno, odometer, current_reading, maintenance_time_freq_id, maintenance_usage_freq_id, last_service_date, last_service_usage_reading, status)
VALUES
-- Unit 1: HEALTHY (Green)
('FL002', UUID(), 'Vehiculo', 'ASM-002', 'ZH-3153-B', '1D7HW48P87S256272', 'Toyota', 'Hilux', 2007, 'Medio Ambiente', 'Terracería', 'Diesel', '255/70 R17', 'BF GOODRICH', 'All-Terrain (A/T)', 245000, 245100, @t_mensual, @u_5k, '2024-04-10', 245000, 'Disponible'),

-- Unit 2: CAUTION (Yellow)
('FL006', UUID(), 'Vehiculo', 'ASM-006', 'ZH-3161-B', '3N6AD33C4GK892141', 'Nissan', 'Frontier', 2016, 'Medio Ambiente', 'Carretera', 'Gasolina', '255/60 R18', 'BF GOODRICH', 'Mixta (H/T)', 82000, 86800, @t_semest, @u_10k, '2023-10-15', 82000, 'Disponible'),

-- Unit 3: OVERDUE (Red)
('FL007', UUID(), 'Vehiculo', 'ASM-007', 'ZH-3160-B', '3N6AD33C5GK814774', 'Nissan', 'NP 300', 2016, 'Laboratorio', 'Pesado', 'Gasolina', '205 R16C', 'BF GOODRICH', 'Carga (LT)', 120000, 128500, @t_mensual, @u_5k, '2023-12-01', 120000, 'Disponible'),

-- Unit 4: HEALTHY
('FL008', UUID(), 'Vehiculo', 'ASM-008', 'TP-0477-H', 'MR0DA3CD8K3900944', 'Toyota', 'Hilux', 2019, 'Operación Mina', 'Mina', 'Diesel', '265/65 R17', 'BF GOODRICH', 'All-Terrain (A/T)', 95000, 95200, @t_mensual, @u_5k, '2024-04-05', 95000, 'Disponible'),

-- Unit 5: NEW (Healthy)
('FL009', UUID(), 'Vehiculo', 'ASM-009', 'VEH-746-D', '3N1CN8AE9SK599731', 'Nissan', 'Versa', 2025, 'Planeación', 'Ciudad', 'Gasolina', '205/55 R16', 'BF GOODRICH', 'Passenger', 0, 150, @t_semest, @u_15k, '2024-03-01', 0, 'Disponible'),

-- Unit 6: NEW
('FL010', UUID(), 'Vehiculo', 'ASM-010', 'UXS-682-E', 'LZWPRMGN6SF107290', 'Chevrolet', 'Aveo', 2025, 'Operación Mina', 'Ciudad', 'Gasolina', '185/60 R15', 'BF GOODRICH', 'Passenger', 0, 50, @t_semest, @u_15k, '2024-03-01', 0, 'Disponible'),

-- Unit 7: HEAVY (Caution)
('FL011', UUID(), 'Vehiculo', 'ASM-011', 'ZH-3152-B', '3C7WRAKT6MG570165', 'Ram', '4000', 2021, 'Manto. Planta', 'Pesada', 'Gasolina', '235/80 R17', 'BF GOODRICH', 'Carga (Rango E)', 45000, 49200, @t_mensual, @u_5k, '2024-03-10', 45000, 'Disponible'),

-- Unit 8: ADMIN (Healthy)
('FL012', UUID(), 'Vehiculo', 'ASM-012', 'ZD-1550-B', 'MMBNLV43XNH055968', 'Mitsubishi', 'L200', 2022, 'Administración', 'Carretera', 'Diesel', '265/60 R18', 'BF GOODRICH', 'High Terrain (H/T)', 32000, 33000, @t_semest, @u_15k, '2024-02-15', 32000, 'Disponible'),

-- Unit 9: LOGISTICS
('FL013', UUID(), 'Vehiculo', 'ASM-013', 'ZD-1551-B', 'MMBNLV433NH056251', 'Mitsubishi', 'L200', 2022, 'Seguridad Ind.', 'Mixto', 'Diesel', '245/70 R16', 'BF GOODRICH', 'All-Terrain (A/T)', 41000, 42000, @t_mensual, @u_10k, '2024-03-20', 41000, 'Disponible'),

-- Unit 10: GEOLOGY (Caution on Distance)
('FL014', UUID(), 'Vehiculo', 'ASM-014', 'ZD-1552-B', 'MMBNLV439NH055993', 'Mitsubishi', 'L200', 2022, 'Geología', 'Campo', 'Diesel', '245/70 R16', 'BF GOODRICH', 'All-Terrain (A/T)', 38000, 46500, @t_mensual, @u_10k, '2024-02-01', 38000, 'Disponible'),

-- Unit 11: CITY (Healthy)
('FL015', UUID(), 'Vehiculo', 'ASM-015', 'ZHY-780-E', 'MR2BF8C38P0005090', 'Toyota', 'Yaris', 2023, 'Administración', 'Ciudad', 'Gasolina', '185/60 R15', 'BF GOODRICH', 'Passenger', 12000, 13000, @t_semest, @u_15k, '2024-02-01', 12000, 'Disponible'),

-- Unit 12: PLANT
('FL016', UUID(), 'Vehiculo', 'ASM-016', 'YW-8191-D', '9BD281H59PYY69987', 'Ram', '700', 2024, 'Operación Planta', 'Planta', 'Gasolina', '185/60 R15', 'BF GOODRICH', 'Carga Ligera', 500, 5000, @t_mensual, @u_10k, '2024-01-10', 500, 'Disponible'),

-- Unit 13: ELECTRIC (Healthy)
('FL017', UUID(), 'Vehiculo', 'ASM-017', 'TK-9722-H', 'MR0DA3CXR4007222', 'Toyota', 'Hilux', 2024, 'Manto. Eléctrico', 'Mina', 'Diesel', '265/65 R17', 'BF GOODRICH', 'All-Terrain (A/T)', 1200, 1500, @t_mensual, @u_5k, '2024-04-01', 1200, 'Disponible'),

-- Unit 14: KIA (Healthy)
('FL018', UUID(), 'Vehiculo', 'ASM-018', 'PCZ-11-91', '3KPA24BC4NE456823', 'Kia', 'Rio', 2022, 'Manto. Planta', 'Ciudad', 'Gasolina', '185/65 R15', 'BF GOODRICH', 'Passenger', 24000, 25000, @t_semest, @u_15k, '2024-03-10', 24000, 'Disponible'),

-- Unit 15: MIXTO
('FL019', UUID(), 'Vehiculo', 'ASM-019', 'TJ-7355-F', 'MRDFA8CD3J3900638', 'Toyota', 'Hilux', 2018, 'Planeación', 'Mixto', 'Diesel', '265/65 R17', 'BF GOODRICH', 'All-Terrain (A/T)', 115000, 118000, @t_mensual, @u_5k, '2024-03-15', 115000, 'Disponible'),

-- Unit 16: EXPLORATION (Overdue)
('FL020', UUID(), 'Vehiculo', 'ASM-020', 'TG-7053-H', 'MR0DA3CD7P4005053', 'Toyota', 'Hilux', 2023, 'Exploración', 'Extremo', 'Diesel', '265/65 R17', 'BF GOODRICH', 'Mud-Terrain (M/T)', 28000, 34500, @t_mensual, @u_5k, '2024-01-20', 28000, 'Disponible'),

-- Unit 17: CAMPO
('FL021', UUID(), 'Vehiculo', 'ASM-021', 'TM-33-95-G', 'TM-33-95-G', 'Toyota', 'Hilux', 2023, 'Planeación', 'Campo', 'Diesel', '265/65 R17', 'BF GOODRICH', 'All-Terrain (A/T)', 42000, 44000, @t_mensual, @u_5k, '2024-04-02', 42000, 'Disponible'),

-- Unit 18: REL COM
('FL022', UUID(), 'Vehiculo', 'ASM-022', 'UWY-713-D', 'MR2BF8C37P0023290', 'Toyota', 'Yaris', 2023, 'Rel. Comunitarias', 'Ciudad', 'Gasolina', '185/60 R15', 'BF GOODRICH', 'Passenger', 18000, 22000, @t_semest, @u_15k, '2024-02-10', 18000, 'Disponible'),

-- Unit 19: SUV ADM
('FL023', UUID(), 'Vehiculo', 'ASM-023', 'UYM-047-C', 'VSSAA75F8H6532319', 'Seat', 'Ateca', 2017, 'Administración', 'Ciudad', 'Gasolina', '215/55 R17', 'BF GOODRICH', 'SUV/Carretera', 105000, 108000, @t_semest, @u_15k, '2024-01-15', 105000, 'Disponible'),

-- Unit 20: PATRIMONIAL
('FL024', UUID(), 'Vehiculo', 'ASM-024', 'YW-7900-D', '3GALD1593PM002498', 'JAC', 'Frison T8', 2023, 'Seg. Patrimonial', 'Mixto', 'Diesel', '265/60 R18', 'BF GOODRICH', 'All-Terrain (A/T)', 21000, 28500, @t_mensual, @u_5k, '2024-02-01', 21000, 'Disponible'),

-- Unit 21: REPARTO
('FL025', UUID(), 'Vehiculo', 'ASM-025', 'ZA-6811-D', '3GALJ1398RM003712', 'JAC', 'X200', 2024, 'Administración', 'Reparto', 'Gasolina', '195/70 R15C', 'BF GOODRICH', 'Carga (Tipo C)', 5000, 8500, @t_mensual, @u_5k, '2024-03-15', 5000, 'Disponible'),

-- Unit 22: GEOLOGY
('FL026', UUID(), 'Vehiculo', 'ASM-026', 'TL-8939-H', 'MR0DA3CD4R4007281', 'Toyota', 'Hilux', 2024, 'Geología', 'Campo', 'Diesel', '265/65 R17', 'BF GOODRICH', 'All-Terrain (A/T)', 15000, 19800, @t_mensual, @u_5k, '2024-03-01', 15000, 'Disponible'),

-- Unit 23: MINA
('FL027', UUID(), 'Vehiculo', 'ASM-027', 'TN-0201-H', 'MR0DA3CD9S4009937', 'Toyota', 'Hilux', 2025, 'Operación Mina', 'Mina', 'Diesel', '265/65 R17', 'BF GOODRICH', 'All-Terrain (A/T)', 100, 100, @t_mensual, @u_5k, '2024-04-15', 0, 'Disponible'),

-- Unit 24: PROVISIONAL
('PROV', UUID(), 'Vehiculo', 'ASM-PROV', 'UYM-047-C', 'S/N-PENDIENTE', 'Nissan', 'Versa', 2017, 'Admin', 'Provisional', 'Gasolina', '215/55 R17', 'BF GOODRICH', 'SUV/Carretera', 85000, 88000, @t_semest, @u_15k, '2024-01-20', 85000, 'Disponible');

-- =============================================================================
-- MIGRATION COMPLETE: 24 UNITS DEPLOYED v.18.5.1
-- =============================================================================

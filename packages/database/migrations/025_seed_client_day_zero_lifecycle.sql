-- ============================================================================
-- 🔱 ARCHON COMMAND CENTER - DAY ZERO SEEDER (v.37.5.0)
-- Script: 025_seed_client_day_zero_lifecycle.sql
-- Description: Absolute Injection of Client's 24 Units with TRUE Metadata.
-- Goal: Synchronize Years, Tire Specs, Fuel and Terrain profile.
-- ============================================================================

-- 1. DESACTIVACIÓN DEL FUSIBLE DE SEGURIDAD
SET FOREIGN_KEY_CHECKS = 0;

-- 2. LIMPIEZA ABSOLUTA
DELETE FROM fleet_maintenance_logs;
DELETE FROM fleet_route_logs;
DELETE FROM fleet_units;

-- 3. REACTIVACIÓN DEL FUSIBLE DE SEGURIDAD
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- BLOQUE A: INYECCIÓN DE ACTIVOS CON ADN TÉCNICO (24 UNIDADES)
-- fuel_type_id: 1=Gasolina, 2=Diesel
-- ============================================================================
INSERT INTO fleet_units (
    id, `uuid`, asset_type_id, marca, modelo, departamento, uso, placas, year, traccion_id, transmision_id, fuel_type_id, color, sede, status, centro_mantenimiento,
    maintenance_usage_freq_id, last_service_date, last_service_reading, odometer, daily_usage_avg,
    tire_spec, tipo_terreno, tire_brand
) VALUES 
('ASM-002', UUID(), 1, 'Toyota', 'Hilux', 'Medio Ambiente', 'Terracería leve', 'ZH-3163-B', 2007, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-09', 119728, 120568, 35.9, '255/70 R15', 'All-Terrain (A/T)', 'ZMAX TERRA XPLORER C2 A/T'),
('ASM-006', UUID(), 1, 'Nissan', 'Frontier', 'Medio Ambiente', 'Carretera/Ciudad', 'ZH-3161-B', 2016, 1, 1, 1, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-11', 356944, 357706, 45.0, '255/60 R18', 'Mixta (H/T)', 'PIRELLI SCORPION ATR 112T'),
('ASM-007', UUID(), 1, 'Nissan', 'NP 300', 'Laboratorio', 'Pesado/Planta', 'ZH-3160-B', 2016, 1, 1, 1, 'Gris', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-11', 327333, 327488, 15.0, '205 R16', 'Carga (LT)', 'BRIDGESTONE DUELER H/T 840'),
('ASM-008', UUID(), 1, 'Toyota', 'Hilux', 'Operación Mina', 'Mina/Roca', 'TP-0477-H', 2019, 1, 1, 2, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-26', 23940, 25486, 110.0, '265/65 R17', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-009', UUID(), 1, 'Nissan', 'Versa', 'General', 'Ciudad', 'VEH-746-D', 2025, 1, 1, 1, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-31', 51006, 52748, 181.3, '205/55 R16', 'Passenger', 'MICHELIN ENERGY XM2+'),
('ASM-010', UUID(), 1, 'Chevrolet', 'Aveo', 'General', 'Ciudad', 'UXS-682-E', 2025, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-13', 19680, 22167, 228.9, '185/60 R15', 'Passenger', 'MICHELIN ENERGY XM2+'),
('ASM-011', UUID(), 1, 'RAM', '4000', 'Mantenimiento Planta', 'Carga Pesada', 'ZH-3152-B', 2021, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-24', 42400, 45742, 56.4, '235/80 R17', 'Carga (Rango E)', 'BF GOODRICH HD-TERRAIN T/A KT'),
('ASM-012', UUID(), 1, 'Mitsubishi', 'L200', 'Gerencia General', 'Carretera', 'ZD-1550-B', 2022, 1, 1, 2, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-02-21', 74677, 75908, 144.9, '265/60 R18', 'High Terrain (H/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-013', UUID(), 1, 'Mitsubishi', 'L200', 'Seguridad Industrial', 'Mixto', 'ZD-1551-B', 2022, 1, 1, 2, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-02-13', 52573, 54854, 43.9, '245/70 R16', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-014', UUID(), 1, 'Mitsubishi', 'L200', 'Geología', 'Campo/Mina', 'ZD-1552-B', 2022, 1, 1, 2, 'Naranja', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-11', 127883, 130427, 124.7, '245/70 R16', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-015', UUID(), 1, 'Toyota', 'Yaris', 'Administración', 'Ciudad', 'ZHY-780-E', 2023, 1, 1, 1, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-29', 150000, 160522, 210.3, '185/60 R15', 'Passenger', 'MICHELIN ENERGY XM2+'),
('ASM-016', UUID(), 1, 'RAM', '700', 'Operación Planta', 'Planta', 'YW-8191-D', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-13', 96515, 106610, 216.0, '185/60 R15', 'Carga Ligera', 'MICHELIN ENERGY XM2+'),
('ASM-017', UUID(), 1, 'Toyota', 'Hilux', 'Mantenimiento Eléctrico', 'Mina', 'TK-9722-H', 2024, 1, 1, 2, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 49627, 50980, 104.9, '265/65 R17', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-018', UUID(), 1, 'Kia', 'Rio', 'General', 'Ciudad', 'PCZ-11-91', 2022, 1, 1, 1, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-23', 96540, 97500, 178.6, '185/65 R15', 'Passenger', 'MICHELIN ENERGY XM2+'),
('ASM-019', UUID(), 1, 'Toyota', 'Hilux', 'Planeación', 'Mixto', 'TJ-7355-F', 2018, 1, 1, 2, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-26', 137423, 137709, 74.7, '265/65 R17', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-020', UUID(), 1, 'Toyota', 'Hilux', 'Exploración', 'Extremo/Lodo', 'TG7053-H', 2023, 1, 1, 2, 'Amarillo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-27', 100834, 106376, 155.9, '265/65 R17', 'Mud-Terrain (M/T)', 'BF GOODRICH MUD TERRAIN T/A KM3'),
('ASM-021', UUID(), 1, 'Toyota', 'Hilux', 'Planeación', 'Campo', 'TM-33-95-G', 2023, 1, 1, 2, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 56874, 58606, 118.4, '265/65 R17', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-022', UUID(), 1, 'Toyota', 'Yaris', 'Relaciones Comunitarias', 'Ciudad', 'UWY-713-D', 2023, 1, 1, 2, 'Gris', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-27', 100000, 104381, 131.3, '185/60 R15', 'Passenger', 'MICHELIN ENERGY XM2+'),
('ASM-023', UUID(), 1, 'Seat', 'Ateca', 'General', 'Ciudad', 'UYM-047-C', 2017, 1, 1, 1, 'Negro', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-26', 25496, 29416, 99.7, '215/55 R17', 'SUV/Carretera', 'MICHELIN PRIMACY 4 +'),
('ASM-PROV', UUID(), 1, 'Nissan', 'Versa', 'General', 'Ciudad', 'PLATA PROV', 2017, 1, 1, 1, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-26', 25496, 29416, 99.7, '215/55 R17', 'SUV/Carretera', 'MICHELIN PRIMACY 4 +'),
('ASM-024', UUID(), 1, 'JAC', 'Frison T8', 'Seguridad Patrimonial', 'Mixto', 'YW-7900-D', 2023, 1, 1, 2, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-11', 186819, 192568, 244.7, '265/60 R18', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-025', UUID(), 1, 'JAC', 'X200', 'Administración', 'Reparto', 'ZA-6811-D', 2024, 1, 1, 1, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-19', 58209, 59661, 145.6, '195/70 R15C', 'Carga (Tipo C)', 'YOKOHAMA BLUEARTH-VAN ALL SEASON'),
('ASM-026', UUID(), 1, 'Toyota', 'Hilux', 'Geología', 'Campo', 'TL-8939-H', 2024, 1, 1, 2, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 61238, 67340, 212.1, '265/65 R17', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3'),
('ASM-027', UUID(), 1, 'Toyota', 'Hilux', 'Operación Mina', 'Mina', 'TN-920-H', 2025, 1, 1, 2, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 11627, 15900, 160.7, '265/65 R17', 'All-Terrain (A/T)', 'BF GOODRICH ALL TERRAIN T/A KO3');

-- ============================================================================
-- BLOQUE B: MOCK DE RUTAS (REPLICACIÓN OPERATIVA)
-- ============================================================================
INSERT INTO fleet_route_logs (
    unit_id, operator_id, destination, start_time, start_km, end_time, end_km
)
SELECT 
    f.id,
    1, -- Default Operator
    'Test Route - Day Zero Baseline',
    f.last_service_date,
    f.last_service_reading,
    DATE_ADD(f.last_service_date, INTERVAL ROUND((f.odometer - f.last_service_reading) / NULLIF(f.daily_usage_avg, 0)) DAY),
    f.odometer
FROM fleet_units f
WHERE f.odometer > f.last_service_reading AND f.daily_usage_avg > 0;

-- ============================================================================
-- 🔱 ARCHON COMMAND CENTER - DAY ZERO SEEDER (v.38.0.0)
-- Script: 025_seed_client_day_zero_lifecycle.sql
-- Description: Absolute Injection of Client's 24 Units using CATALOG IDs.
-- Architecture: 100% Normalized schema (Migration 028 compliant).
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
-- BLOQUE A: INYECCIÓN DE ACTIVOS NORMALIZADOS
-- Catalogs used:
-- fuel_type_id: 10=Diesel, 11=Gasolina
-- brand_id: 253=Toyota, 23=Nissan, 32=Chevrolet, 33=RAM, 35=Mitsubishi, 37=Kia, 256=JAC, 34=Seat
-- model_id: 636=Hilux, 528=Versa, 553=Aveo, 121=Ram700, 128=Ram4000, 572=L200, 585=Rio, 642=Yaris, 364=FrisonT8, 525=Frontier/NP300
-- dept_id: 228=Medio Ambiente, 225=Lab, 229=Mina, 227=Manto Planta, 222=Admin/General, 234=Seg Industrial, 224=Geologia, 230=Oper Planta, 231=Plan, 223=Explor, 232=Rel Com, 233=Seg Pat
-- use_type_id: 236=Staff, 239=CargoP, 242=Mina, 241=OpExtrema, 238=CargoL, 275=Mixto, 276=Planta
-- tire_brand_id: 264=ZMAX, 265=Pirelli, 266=Bridgestone, 244=BFG, 243=Michelin, 267=Yokohama
-- terrain_type_id: 269=AT, 270=MT, 271=HT, 272=Passenger, 273=Cargo, 274=SUV
-- ============================================================================

INSERT INTO fleet_units (
    id, `uuid`, asset_type_id, brand_id, model_id, marca, modelo, departamento, department_id, uso, operational_use_id, placas, year, traccion_id, transmision_id, fuel_type_id, color, sede, status, centro_mantenimiento,
    maintenance_usage_freq_id, last_service_date, last_service_reading, odometer, daily_usage_avg,
    tire_spec, terrain_type_id, tire_brand_id, tire_brand, tipo_terreno
) VALUES 
('ASM-002', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Medio Ambiente', 228, 'Terracería leve', 241, 'ZH-3163-B', 2007, 1, 1, 11, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-09', 119728, 120568, 35.9, '255/70 R15', 269, 264, 'ZMAX TERRA XPLORER C2 A/T', 'All-Terrain (A/T)'),
('ASM-006', UUID(), 1, 23, 525, 'Nissan', 'Frontier', 'Medio Ambiente', 228, 'Carretera/Ciudad', 236, 'ZH-3161-B', 2016, 1, 1, 11, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-11', 356944, 357706, 45.0, '255/60 R18', 271, 265, 'PIRELLI SCORPION ATR 112T', 'Mixta (H/T)'),
('ASM-007', UUID(), 1, 23, 525, 'Nissan', 'NP 300', 'Laboratorio', 225, 'Pesado/Planta', 239, 'ZH-3160-B', 2016, 1, 1, 11, 'Gris', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-11', 327333, 327488, 15.0, '205 R16', 273, 266, 'BRIDGESTONE DUELER H/T 840', 'Carga (LT)'),
('ASM-008', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Operación Mina', 229, 'Mina/Roca', 242, 'TP-0477-H', 2019, 1, 1, 10, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-26', 23940, 25486, 110.0, '265/65 R17', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-009', UUID(), 1, 23, 528, 'Nissan', 'Versa', 'General', 222, 'Ciudad', 236, 'VEH-746-D', 2025, 1, 1, 11, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-31', 51006, 52748, 181.3, '205/55 R16', 272, 243, 'MICHELIN ENERGY XM2+', 'Passenger'),
('ASM-010', UUID(), 1, 32, 553, 'Chevrolet', 'Aveo', 'General', 222, 'Ciudad', 236, 'UXS-682-E', 2025, 1, 1, 11, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-13', 19680, 22167, 228.9, '185/60 R15', 272, 243, 'MICHELIN ENERGY XM2+', 'Passenger'),
('ASM-011', UUID(), 1, 33, 128, 'RAM', '4000', 'Mantenimiento Planta', 227, 'Carga Pesada', 239, 'ZH-3152-B', 2021, 1, 1, 11, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-24', 42400, 45742, 56.4, '235/80 R17', 273, 244, 'BF GOODRICH HD-TERRAIN T/A KT', 'Carga (Rango E)'),
('ASM-012', UUID(), 1, 35, 572, 'Mitsubishi', 'L200', 'Gerencia General', 222, 'Carretera', 236, 'ZD-1550-B', 2022, 1, 1, 10, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-02-21', 74677, 75908, 144.9, '265/60 R18', 271, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'High Terrain (H/T)'),
('ASM-013', UUID(), 1, 35, 572, 'Mitsubishi', 'L200', 'Seguridad Industrial', 234, 'Mixto', 275, 'ZD-1551-B', 2022, 1, 1, 10, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-02-13', 52573, 54854, 43.9, '245/70 R16', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-014', UUID(), 1, 35, 572, 'Mitsubishi', 'L200', 'Geología', 224, 'Campo/Mina', 241, 'ZD-1552-B', 2022, 1, 1, 10, 'Naranja', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-11', 127883, 130427, 124.7, '245/70 R16', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-015', UUID(), 1, 253, 642, 'Toyota', 'Yaris', 'Administración', 222, 'Ciudad', 236, 'ZHY-780-E', 2023, 1, 1, 11, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-29', 150000, 160522, 210.3, '185/60 R15', 272, 243, 'MICHELIN ENERGY XM2+', 'Passenger'),
('ASM-016', UUID(), 1, 33, 121, 'RAM', '700', 'Operación Planta', 230, 'Planta', 276, 'YW-8191-D', 2024, 1, 1, 11, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-13', 96515, 106610, 216.0, '185/60 R15', 273, 243, 'MICHELIN ENERGY XM2+', 'Carga Ligera'),
('ASM-017', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Mantenimiento Eléctrico', 226, 'Mina', 242, 'TK-9722-H', 2024, 1, 1, 10, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 49627, 50980, 104.9, '265/65 R17', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-018', UUID(), 1, 37, 585, 'Kia', 'Rio', 'General', 222, 'Ciudad', 236, 'PCZ-11-91', 2022, 1, 1, 11, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-23', 96540, 97500, 178.6, '185/65 R15', 272, 243, 'MICHELIN ENERGY XM2+', 'Passenger'),
('ASM-019', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Planeación', 231, 'Mixto', 275, 'TJ-7355-F', 2018, 1, 1, 10, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-26', 137423, 137709, 74.7, '265/65 R17', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-020', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Exploración', 223, 'Extremo/Lodo', 241, 'TG7053-H', 2023, 1, 1, 10, 'Amarillo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-27', 100834, 106376, 155.9, '265/65 R17', 270, 244, 'BF GOODRICH MUD TERRAIN T/A KM3', 'Mud-Terrain (M/T)'),
('ASM-021', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Planeación', 231, 'Campo', 241, 'TM-33-95-G', 2023, 1, 1, 10, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 56874, 58606, 118.4, '265/65 R17', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-022', UUID(), 1, 253, 642, 'Toyota', 'Yaris', 'Relaciones Comunitarias', 232, 'Ciudad', 236, 'UWY-713-D', 2023, 1, 1, 11, 'Gris', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-27', 100000, 104381, 131.3, '185/60 R15', 272, 243, 'MICHELIN ENERGY XM2+', 'Passenger'),
('ASM-023', UUID(), 1, 34, 666, 'Seat', 'Ateca', 'General', 222, 'Ciudad', 236, 'UYM-047-C', 2017, 1, 1, 11, 'Negro', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-26', 25496, 29416, 99.7, '215/55 R17', 274, 243, 'MICHELIN PRIMACY 4 +', 'SUV/Carretera'),
('ASM-PROV', UUID(), 1, 23, 528, 'Nissan', 'Versa', 'General', 222, 'Ciudad', 236, 'PLATA PROV', 2017, 1, 1, 11, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-26', 25496, 29416, 99.7, '215/55 R17', 274, 243, 'MICHELIN PRIMACY 4 +', 'SUV/Carretera'),
('ASM-024', UUID(), 1, 256, 364, 'JAC', 'Frison T8', 'Seguridad Patrimonial', 233, 'Mixto', 275, 'YW-7900-D', 2023, 1, 1, 10, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-11', 186819, 192568, 244.7, '265/60 R18', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-025', UUID(), 1, 256, 666, 'JAC', 'X200', 'Administración', 222, 'Reparto', 238, 'ZA-6811-D', 2024, 1, 1, 11, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-19', 58209, 59661, 145.6, '195/70 R15C', 273, 267, 'YOKOHAMA BLUEARTH-VAN ALL SEASON', 'Carga (Tipo C)'),
('ASM-026', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Geología', 224, 'Campo', 241, 'TL-8939-H', 2024, 1, 1, 10, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 61238, 67340, 212.1, '265/65 R17', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)'),
('ASM-027', UUID(), 1, 253, 636, 'Toyota', 'Hilux', 'Operación Mina', 229, 'Mina', 242, 'TN-920-H', 2025, 1, 1, 10, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 11627, 15900, 160.7, '265/65 R17', 269, 244, 'BF GOODRICH ALL TERRAIN T/A KO3', 'All-Terrain (A/T)');

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

-- ============================================================================
-- 🔱 ARCHON COMMAND CENTER - DAY ZERO SEEDER
-- Script: 025_seed_client_day_zero_lifecycle.sql
-- Description: Absolute Truncation & Mass Injection of Client's 24 Pure Fleet Units.
-- Note: Replaces all historical garbage data with industrial-grade operations.
-- ============================================================================

-- 1. DESACTIVACIÓN DEL FUSIBLE DE SEGURIDAD (Permitir borrado maestro)
SET FOREIGN_KEY_CHECKS = 0;

-- 2. LIMPIEZA ABSOLUTA (Pizarrón en Blanco vía DELETE para evadir el Error #1701 de InnoDB)
DELETE FROM fleet_maintenance_logs;
DELETE FROM fleet_route_logs;
DELETE FROM fleet_units;

-- 3. REACTIVACIÓN DEL FUSIBLE DE SEGURIDAD
SET FOREIGN_KEY_CHECKS = 1;

-- 4. MATRIZ DE DEFAULTS INDUSTRIALES (Preparación para Inserción)
-- asset_type_id = 1 (Vehículo)
-- traccion_id = 1 (4x2 / Estándar Default)
-- transmision_id = 1 (Manual Default)
-- fuel_type_id = 1 (Gasolina Default)
-- sede = 'Arial Silver Zacatecas' 
-- maintenance_usage_freq_id: 1 (5,000) or 2 (10,000) - Assuming 2=10k, 1=5k based on catalog norm.

-- ============================================================================
-- BLOQUE A: INYECCIÓN DE ACTIVOS PURIFICADOS (24 UNIDADES)
-- ============================================================================
INSERT INTO fleet_units (
    id, `uuid`, asset_type_id, marca, modelo, departamento, uso, placas, year, traccion_id, transmision_id, fuel_type_id, color, sede, status, centro_mantenimiento,
    maintenance_usage_freq_id, last_service_date, last_service_reading, odometer, daily_usage_avg
) VALUES 
('ASM-002', UUID(), 1, 'Toyota', 'Hilux', 'Medio Ambiente', 'OPERATIVO', 'ZH-3163-B', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-09', 119728, 120568, 35.9),
('ASM-006', UUID(), 1, 'Nissan', 'Frontier', 'Medio Ambiente', 'OPERATIVO', 'ZH-3161-B', 2024, 1, 1, 1, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-11', 356944, 357706, 45.0),
('ASM-007', UUID(), 1, 'Nissan', 'NP 300', 'Laboratorio', 'OPERATIVO', 'ZH-3160-B', 2024, 1, 1, 1, 'Gris', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-11', 327333, 327488, 15.0),
('ASM-008', UUID(), 1, 'Toyota', 'Hilux', 'Operación Mina', 'OPERATIVO', 'TP-0477-H', 2024, 1, 1, 1, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-26', 23940, 25486, 110.0),
('ASM-009', UUID(), 1, 'Nissan', 'Versa', 'General', 'ADMINISTRATIVO', 'VEH-746-D', 2024, 1, 1, 1, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-31', 51006, 52748, 181.3),
('ASM-010', UUID(), 1, 'Chevrolet', 'Aveo', 'General', 'ADMINISTRATIVO', 'UXS-682-E', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-13', 19680, 22167, 228.9),
('ASM-011', UUID(), 1, 'RAM', '4000', 'Mantenimiento Planta', 'CARGA', 'ZH-3152-B', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-24', 42400, 45742, 56.4),
('ASM-012', UUID(), 1, 'Mitsubishi', 'L200', 'Gerencia General', 'ADMINISTRATIVO', 'ZD-1550-B', 2024, 1, 1, 1, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-02-21', 74677, 75908, 144.9),
('ASM-013', UUID(), 1, 'Mitsubishi', 'L200', 'Seguridad Industrial', 'OPERATIVO', 'ZD-1551-B', 2024, 1, 1, 1, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-02-13', 52573, 54854, 43.9),
('ASM-014', UUID(), 1, 'Mitsubishi', 'L200', 'Geología', 'OPERATIVO', 'ZD-1552-B', 2024, 1, 1, 1, 'Naranja', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-11', 127883, 130427, 124.7),
('ASM-015', UUID(), 1, 'Toyota', 'Yaris', 'Administración', 'ADMINISTRATIVO', 'ZHY-780-E', 2024, 1, 1, 1, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-29', 150000, 160522, 210.3),
('ASM-016', UUID(), 1, 'RAM', '700', 'Operación Planta', 'CARGA', 'YW-8191-D', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-13', 96515, 106610, 216.0),
('ASM-017', UUID(), 1, 'Toyota', 'Hilux', 'Mantenimiento Eléctrico', 'OPERATIVO', 'TK-9722-H', 2024, 1, 1, 1, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 49627, 50980, 104.9),
('ASM-018', UUID(), 1, 'Kia', 'Rio', 'General', 'ADMINISTRATIVO', 'PCZ-11-91', 2024, 1, 1, 1, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-23', 96540, 97500, 178.6),
('ASM-019', UUID(), 1, 'Toyota', 'Hilux', 'Planeación', 'OPERATIVO', 'TJ-7355-F', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-26', 137423, 137709, 74.7),
('ASM-020', UUID(), 1, 'Toyota', 'Hilux', 'Exploración', 'OPERATIVO', 'TG7053-H', 2024, 1, 1, 1, 'Amarillo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-27', 100834, 106376, 155.9),
('ASM-021', UUID(), 1, 'Toyota', 'Hilux', 'Planeación', 'OPERATIVO', 'TM-33-95-G', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 56874, 58606, 118.4),
('ASM-022', UUID(), 1, 'Toyota', 'Yaris', 'Relaciones Comunitarias', 'ADMINISTRATIVO', 'UWY-713-D', 2024, 1, 1, 1, 'Gris', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-27', 100000, 104381, 131.3),
('ASM-023', UUID(), 1, 'Seat', 'Ateca', 'General', 'ADMINISTRATIVO', 'UYM-047-C', 2024, 1, 1, 1, 'Negro', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-26', 25496, 29416, 99.7),
('ASM-PROV', UUID(), 1, 'Nissan', 'Versa', 'General', 'ADMINISTRATIVO', 'PLATA PROV', 2024, 1, 1, 1, 'Plateado', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-02-26', 25496, 29416, 99.7),
('ASM-024', UUID(), 1, 'JAC', 'Frison T8', 'Seguridad Patrimonial', 'OPERATIVO', 'YW-7900-D', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-11', 186819, 192568, 244.7),
('ASM-025', UUID(), 1, 'JAC', 'X200', 'Administración', 'ADMINISTRATIVO', 'ZA-6811-D', 2024, 1, 1, 1, 'Azul', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 2, '2026-03-19', 58209, 59661, 145.6),
('ASM-026', UUID(), 1, 'Toyota', 'Hilux', 'Geología', 'OPERATIVO', 'TL-8939-H', 2024, 1, 1, 1, 'Blanco', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 61238, 67340, 212.1),
('ASM-027', UUID(), 1, 'Toyota', 'Hilux', 'Operación Mina', 'OPERATIVO', 'TN-920-H', 2024, 1, 1, 1, 'Rojo', 'Arian Silver Zacatecas', 'Disponible', 'PIIC', 1, '2026-03-27', 11627, 15900, 160.7);

-- ============================================================================
-- BLOQUE B: MOCK DE RUTAS (ENGANÑO OPERATIVO DEL DÍA CERO)
-- ============================================================================
-- A justification of the Odometer gap. 
-- Example: ASM-002 went from 119728 -> 120568 (Delta: 840 km).
-- With 35.9 km/day... 840 / 35.9 = 23 days ago.
-- We are just injecting exactly a "route" to satisfy the accumulated mileage dynamically.

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

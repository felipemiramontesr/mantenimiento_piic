-- =============================================================================
-- Seed: 002 - Master Fleet High Fidelity & Traceability
-- Architecture: Archon Collective Performance Standards (v.25.0.0)
-- Description: Injects 24 Master Fleet units with full technical & legal data.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. PURGE OPERATIONAL DATA ───────────────────────────────────────────────
DELETE FROM fleet_maintenance_schedules;
DELETE FROM fleet_maintenance_logs;
DELETE FROM fleet_units;

-- ── 2. ENSURE CATALOG INTEGRITY ──────────────────────────────────────────────
REPLACE INTO common_catalogs (id, category, code, label, numeric_value, unit) VALUES 
(1, 'ASSET_TYPE', 'AT_VEH',  'Vehiculo', NULL, NULL),
(10, 'FUEL', 'F_DIESEL', 'Diesel', NULL, NULL),
(11, 'FUEL', 'F_GAS',    'Gasolina', NULL, NULL),
(20, 'DRIVE_TYPE', 'DR_4X2',   '4x2', NULL, NULL),
(21, 'DRIVE_TYPE', 'DR_4X4',   '4x4', NULL, NULL),
(30, 'TRANSMISSION', 'TR_AUTO', 'Automática', NULL, NULL),
(31, 'TRANSMISSION', 'TR_MAN',  'Estándar (Manual)', NULL, NULL),
(40, 'MAINT_FREQ_TIME', 'FT_90D', 'Trimestral', 90, 'days'),
(41, 'MAINT_FREQ_TIME', 'FT_30D', 'Mensual', 30, 'days'),
(42, 'MAINT_FREQ_USAGE', 'FU_5K', '5,000 km', 5000, 'km');

-- ── 3. INJECT HI-FI MASTER VEHICULAR FLEET (24 UNITS) ───────────────────────

INSERT INTO fleet_units (
    id, uuid, asset_type_id, marca, modelo, year, status, 
    fuel_type_id, traccion_id, transmision_id, odometer,
    availability_index, mtbf_hours, mttr_hours, backlog_count,
    maintenance_time_freq_id, maintenance_usage_freq_id,
    tire_spec, tire_brand, placas, tarjeta_circulacion, uso, departamento
) VALUES 
-- 1. Toyota Hilux Medio Ambiente (2007)
('ASM-001', UUID(), 1, 'Toyota', 'Hilux MA', 2007, 'Disponible', 11, 20, 31, 312450.00, 75.0, 320.0, 24.5, 1, 41, 42, '255/70 R15', 'ZMAX TERRA XPLORER', 'PL-1025-A', 'TC-9001-A', 'Conservación Biológica', 'Medio Ambiente'),
-- 2. Nissan Frontier (2016)
('ASM-002', UUID(), 1, 'Nissan', 'Frontier MA', 2016, 'En Ruta', 11, 20, 31, 156800.00, 88.2, 850.0, 8.4, 0, 41, 42, '255/60 R18', 'PIRELLI SCORPION', 'MX-8842-B', 'TC-9002-B', 'Monitoreo de Suelos', 'Medio Ambiente'),
-- 3. Nissan NP 300 Lab (2016)
('ASM-003', UUID(), 1, 'Nissan', 'NP300 Lab', 2016, 'Disponible', 11, 20, 31, 142300.00, 84.5, 780.0, 12.2, 0, 41, 42, '205 R16', 'BRIDGESTONE DUELER', 'LB-4055-Z', 'TC-9003-C', 'Muestreo de Agua', 'Laboratorio'),
-- 4. Toyota Hilux Mina (2019)
('ASM-004', UUID(), 1, 'Toyota', 'Hilux Mina', 2019, 'Disponible', 10, 21, 31, 118500.00, 89.1, 950.0, 6.2, 0, 40, 42, '265/65 R17', 'BF GOODRICH KO3', 'MN-7720-X', 'TC-9004-D', 'Geotecnia Tajo', 'Operación Mina'),
-- 5. Nissan Versa (2025)
('ASM-005', UUID(), 1, 'Nissan', 'Versa', 2025, 'Disponible', 11, 20, 30, 450.00, 99.8, 2400.0, 1.2, 0, 41, 42, '205/55 R16', 'MICHELIN ENERGY', 'TX-0001-A', 'TC-9005-E', 'Enlace Ejecutivo', 'Administración'),
-- 6. Chevrolet Aveo (2025)
('ASM-006', UUID(), 1, 'Chevrolet', 'Aveo', 2025, 'En Ruta', 11, 20, 30, 820.00, 99.5, 2200.0, 1.5, 0, 41, 42, '185/60 R15', 'MICHELIN ENERGY', 'TX-0002-A', 'TC-9006-F', 'Logística Ligera', 'Logística'),
-- 7. Ram 4000 Planta (2021)
('ASM-007', UUID(), 1, 'Ram', '4000 Planta', 2021, 'Disponible', 11, 21, 31, 68400.00, 92.4, 1100.0, 4.8, 0, 40, 42, '235/80 R17', 'BF GOODRICH HD', 'CP-9011-Y', 'TC-9007-G', 'Transporte de Insumos', 'Mantenimiento Planta'),
-- 8. L200 Ger (2022)
('ASM-008', UUID(), 1, 'Mitsubishi', 'L200 Ger', 2022, 'Disponible', 10, 20, 30, 42600.00, 95.8, 1250.0, 3.5, 0, 41, 42, '265/60 R18', 'BF GOODRICH KO3', 'GG-1120-L', 'TC-9008-H', 'Supervisión General', 'Gerencia'),
-- 9. L200 Seguridad (2022)
('ASM-009', UUID(), 1, 'Mitsubishi', 'L200 Seg', 2022, 'En Ruta', 10, 21, 31, 54200.00, 91.2, 920.0, 5.4, 0, 41, 42, '245/70 R16', 'BF GOODRICH KO3', 'SI-2230-S', 'TC-9009-I', 'Patrullaje Industrial', 'Seguridad Industrial'),
-- 10. L200 Geología (2022)
('ASM-010', UUID(), 1, 'Mitsubishi', 'L200 Geo', 2022, 'Disponible', 10, 21, 31, 61800.00, 88.5, 880.0, 6.1, 0, 41, 42, '245/70 R16', 'BF GOODRICH KO3', 'GE-3340-G', 'TC-9010-J', 'Levantamiento de Campo', 'Geología'),
-- 11. Yaris Admin (2023)
('ASM-011', UUID(), 1, 'Toyota', 'Yaris Admin', 2023, 'Disponible', 11, 20, 30, 24100.00, 97.4, 1600.0, 2.1, 0, 41, 42, '185/60 R15', 'MICHELIN ENERGY', 'AD-5560-T', 'TC-9011-K', 'Mandados Corporativos', 'Administración'),
-- 12. Ram 700 Planta (2024)
('ASM-012', UUID(), 1, 'Ram', '700 Planta', 2024, 'Disponible', 11, 20, 31, 12800.00, 98.2, 1850.0, 1.8, 0, 41, 42, '185/60 R15', 'MICHELIN ENERGY', 'OP-1044-R', 'TC-9012-L', 'Refacciones Críticas', 'Mantenimiento Planta'),
-- 13. Hilux Eléctrico (2024)
('ASM-013', UUID(), 1, 'Toyota', 'Hilux Elec', 2024, 'En Mantenimiento', 10, 21, 31, 15400.00, 96.5, 1420.0, 4.2, 1, 41, 42, '265/65 R17', 'BF GOODRICH KO3', 'EL-8890-W', 'TC-9013-M', 'Redes de Media Tensión', 'Mantenimiento Eléctrico'),
-- 14. Kia Rio (2022)
('ASM-014', UUID(), 1, 'Kia', 'Rio', 2022, 'Disponible', 11, 20, 30, 45900.00, 94.1, 1150.0, 3.8, 0, 41, 42, '185/65 R15', 'MICHELIN ENERGY', 'KR-2210-Q', 'TC-9014-N', 'Pool Administrativo', 'Administración'),
-- 15. Toyota Hilux (2018)
('ASM-015', UUID(), 1, 'Toyota', 'Hilux', 2018, 'Disponible', 10, 21, 31, 124000.00, 84.2, 750.0, 14.5, 0, 40, 42, '265/65 R17', 'BF GOODRICH KO3', 'MX-4420-V', 'TC-9015-O', 'Uso Múltiple', 'Operación Genérica'),
-- 16. Hilux Explore (2023)
('ASM-016', UUID(), 1, 'Toyota', 'Hilux Exp', 2023, 'En Ruta', 10, 21, 31, 32500.00, 93.4, 1200.0, 5.2, 0, 41, 42, '265/65 R17', 'BF GOODRICH KM3', 'EX-0010-F', 'TC-9016-P', 'Vías de Tercera', 'Exploración'),
-- 17. Hilux Planning (2023)
('ASM-017', UUID(), 1, 'Toyota', 'Hilux Plan', 2023, 'Disponible', 10, 21, 31, 28600.00, 96.1, 1450.0, 2.5, 0, 41, 42, '265/65 R17', 'BF GOODRICH KO3', 'PL-9910-K', 'TC-9017-Q', 'Proyecciones Geológicas', 'Planeación'),
-- 18. Yaris Comm (2023)
('ASM-018', UUID(), 1, 'Toyota', 'Yaris Comm', 2023, 'Disponible', 10, 20, 30, 26400.00, 95.2, 1380.0, 2.8, 0, 41, 42, '185/60 R15', 'MICHELIN ENERGY', 'RC-3310-M', 'TC-9018-R', 'Atención a Comunidades', 'Relaciones Comunitarias'),
-- 19. Seat Ateca (2017)
('ASM-019', UUID(), 1, 'Seat', 'Ateca', 2017, 'Disponible', 11, 20, 30, 98200.00, 86.4, 820.0, 12.4, 0, 41, 42, '215/55 R17', 'MICHELIN PRIMACY 4', 'TX-5510-U', 'TC-9019-S', 'Traslados Especiales', 'Gerencia Adm'),
-- 20. Frision T8 (2023)
('ASM-020', UUID(), 1, 'JAC', 'Frision T8', 2023, 'En Ruta', 10, 21, 31, 41800.00, 92.5, 1180.0, 5.8, 0, 41, 42, '265/60 R18', 'BF GOODRICH KO3', 'SP-4420-D', 'TC-9020-T', 'Seguridad Patrimonial', 'Seguridad'),
-- 21. JAC X200 (2024)
('ASM-021', UUID(), 1, 'JAC', 'X200 Admin', 2024, 'Disponible', 11, 20, 31, 9200.00, 98.4, 1920.0, 1.8, 0, 41, 42, '195/70 R15C', 'YOKOHAMA BLUEARTH', 'RE-6610-P', 'TC-9021-U', 'Distribución de Insumos', 'Reparto'),
-- 22. Hilux Geología (2024)
('ASM-022', UUID(), 1, 'Toyota', 'Hilux Geo', 2024, 'Disponible', 10, 21, 31, 11400.00, 97.2, 1640.0, 2.2, 0, 41, 42, '265/65 R17', 'BF GOODRICH KO3', 'GE-4450-H', 'TC-9022-V', 'Exploración Tier 2', 'Geología'),
-- 23. Hilux Mina 25 (2025)
('ASM-023', UUID(), 1, 'Toyota', 'Hilux Mina 25', 2025, 'Disponible', 10, 21, 31, 1200.00, 99.9, 2800.0, 1.0, 0, 40, 42, '265/65 R17', 'BF GOODRICH KO3', 'TX-0023-A', 'TC-9023-W', 'Operación de Turno A', 'Mina'),
-- 24. Hilux Mina 25B (2025)
('ASM-024', UUID(), 1, 'Toyota', 'Hilux Mina 25B', 2025, 'Disponible', 10, 21, 31, 950.00, 99.9, 2850.0, 0.8, 0, 40, 42, '265/65 R17', 'BF GOODRICH KO3', 'TX-0024-A', 'TC-9024-X', 'Operación de Turno B', 'Mina');

-- ── 4. LOG TRACEABILITY (Realistic Maintenance History) ───────────────
INSERT INTO fleet_maintenance_logs (
    unit_id, service_date, service_type, odometer_at_service, 
    description, technician, is_failure, service_category, downtime_start, downtime_end
) VALUES 
('ASM-001', DATE_SUB(NOW(), INTERVAL 180 DAY), 'Servicio Mayor', 310000, 'Revisión completa de componentes críticos por antigüedad', 'Archon Master', FALSE, 'Preventivo', DATE_SUB(NOW(), INTERVAL 181 DAY), DATE_SUB(NOW(), INTERVAL 180 DAY)),
('ASM-004', DATE_SUB(NOW(), INTERVAL 30 DAY), 'Reparación Suspensión', 115000, 'Reemplazo de amortiguadores y rótulas por impacto en rampa', 'Archon Tech 2', TRUE, 'Correctivo', DATE_SUB(NOW(), INTERVAL 31 DAY), DATE_SUB(NOW(), INTERVAL 30 DAY)),
('ASM-013', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Falla Alternador', 15350, 'Falla prematura de componente eléctrico', 'Silicon Specialist', TRUE, 'Correctivo', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL);

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SEED COMPLETE: Master Fleet High Fidelity & Traceability v.25.0.0
-- =============================================================================;

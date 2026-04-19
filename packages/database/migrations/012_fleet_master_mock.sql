-- =============================================================================
-- Migration: 012 - Sovereign Fleet Master Seeding (24 Units)
-- Architecture: PIIC Archon Analytical Seeding
-- Version: 20.1.0.0
-- Author: ArchonCore
-- Description: Injects 24 realistic production units with Analytical KPIs.
-- =============================================================================

-- CLEANUP (Optional: Remove current units to avoid duplicates during seeding)
-- DELETE FROM fleet_units WHERE id LIKE 'ASM-%';

INSERT INTO fleet_units 
(id, uuid, asset_type, tag, numero_serie, marca, modelo, year, motor, traccion, transmision, fuel_type, tire_spec, tire_brand, odometer, status, availability_index, mtbf_hours, mttr_hours, backlog_count, images)
VALUES
-- 1. Toyota Hilux Medio Ambiente (2007) - OLD STABLE
('ASM-001', UUID(), 'Vehiculo', 'ASM-001', 'VIN-TYT-MA-001', 'Toyota', 'Hilux Medio Ambiente', 2007, '2.7L L4', '4x4', 'Estándar (Manual)', 'Gasolina', '255/70 R15', 'ZMAX TERRA XPLORER', 342100.00, 'Disponible', 82.40, 48.00, 14.50, 3, '[]'),

-- 2. Nissan Frontier Medio Ambiente (2016)
('ASM-002', UUID(), 'Vehiculo', 'ASM-002', 'VIN-NIS-MA-002', 'Nissan', 'Frontier Medio Ambiente', 2016, '2.5L L4', '4x2', 'Automática', 'Gasolina', '255/60 R18', 'PIRELLI SCORPION', 185300.20, 'Disponible', 89.10, 72.00, 8.20, 1, '[]'),

-- 3. Nissan NP 300 Laboratorio (2016)
('ASM-003', UUID(), 'Vehiculo', 'ASM-003', 'VIN-NIS-LB-003', 'Nissan', 'NP 300 Laboratorio', 2016, '2.5L L4', '4x2', 'Estándar (Manual)', 'Gasolina', '205 R16', 'BRIDGESTONE DUELER', 210450.00, 'Disponible', 85.50, 60.50, 10.40, 2, '[]'),

-- 4. Toyota Hilux Operación Mina (2019)
('ASM-004', UUID(), 'Vehiculo', 'ASM-004', 'VIN-TYT-OM-004', 'Toyota', 'Hilux Operación Mina', 2019, '2.8L Diesel', '4x4', 'Automática', 'Diesel', '265/65 R17', 'BF GOODRICH KO3', 142300.00, 'Disponible', 92.10, 120.00, 6.50, 0, '[]'),

-- 5. Nissan Versa (2025) - NEW
('ASM-005', UUID(), 'Vehiculo', 'ASM-005', 'VIN-NIS-VS-005', 'Nissan', 'Versa', 2025, '1.6L L4', '4x2', 'Automática', 'Gasolina', '205/55 R16', 'MICHELIN ENERGY', 1200.00, 'Disponible', 100.00, 500.00, 0.00, 0, '[]'),

-- 6. Chevrolet Aveo (2025)
('ASM-006', UUID(), 'Vehiculo', 'ASM-006', 'VIN-CHV-AV-006', 'Chevrolet', 'Aveo', 2025, '1.5L L4', '4x2', 'Automática', 'Gasolina', '185/60 R15', 'MICHELIN ENERGY', 850.00, 'Disponible', 100.00, 500.00, 0.00, 0, '[]'),

-- 7. Ram 4000 Mantenimiento Planta (2021)
('ASM-007', UUID(), 'Vehiculo', 'ASM-007', 'VIN-RAM-MP-007', 'Dodge / Ram', 'Ram 4000 Manto. Planta', 2021, '6.4L V8', '4x2', 'Automática', 'Gasolina', '235/80 R17', 'BF GOODRICH HD', 95300.00, 'Disponible', 91.20, 110.00, 12.00, 1, '[]'),

-- 8. L200 Gerencia General (2022)
('ASM-008', UUID(), 'Vehiculo', 'ASM-008', 'VIN-MIT-GG-008', 'Mitsubishi', 'L200 Gerencia General', 2022, '2.4L Diesel', '4x4', 'Automática', 'Diesel', '265/60 R18', 'BF GOODRICH KO3', 45200.00, 'Disponible', 96.50, 240.00, 4.20, 0, '[]'),

-- 9. L200 Seguridad Industrial (2022)
('ASM-009', UUID(), 'Vehiculo', 'ASM-009', 'VIN-MIT-SI-009', 'Mitsubishi', 'L200 Seguridad Industrial', 2022, '2.4L Diesel', '4x4', 'Manual', 'Diesel', '245/70 R16', 'BF GOODRICH KO3', 68900.00, 'Disponible', 94.20, 180.00, 5.10, 0, '[]'),

-- 10. L200 Geología (2022)
('ASM-010', UUID(), 'Vehiculo', 'ASM-010', 'VIN-MIT-GE-010', 'Mitsubishi', 'L200 Geología', 2022, '2.4L Diesel', '4x4', 'Manual', 'Diesel', '245/70 R16', 'BF GOODRICH KO3', 75200.00, 'Disponible', 93.80, 160.00, 6.80, 1, '[]'),

-- 11. Toyota Yaris Administración (2023)
('ASM-011', UUID(), 'Vehiculo', 'ASM-011', 'VIN-TYT-AD-011', 'Toyota', 'Yaris Administración', 2023, '1.5L L4', '4x2', 'Automática', 'Gasolina', '185/60 R15', 'MICHELIN ENERGY', 25600.00, 'Disponible', 98.10, 400.00, 2.10, 0, '[]'),

-- 12. Ram 700 Operación Planta (2024)
('ASM-012', UUID(), 'Vehiculo', 'ASM-012', 'VIN-RAM-OP-012', 'Dodge / Ram', 'Ram 700 Operación Planta', 2024, '1.3L L4', '4x2', 'Manual', 'Gasolina', '185/60 R15', 'MICHELIN ENERGY', 12300.00, 'Disponible', 100.00, 450.00, 0.00, 0, '[]'),

-- 13. Hilux Mantenimiento Eléctrico (2024)
('ASM-013', UUID(), 'Vehiculo', 'ASM-013', 'VIN-TYT-EL-013', 'Toyota', 'Hilux Manto. Eléctrico', 2024, '2.8L Diesel', '4x4', 'Manual', 'Diesel', '265/65 R17', 'BF GOODRICH KO3', 15400.00, 'Disponible', 97.40, 210.00, 4.50, 0, '[]'),

-- 14. Kia Rio (2022)
('ASM-014', UUID(), 'Vehiculo', 'ASM-014', 'VIN-KIA-RI-014', 'Kia', 'Rio', 2022, '1.6L L4', '4x2', 'Automática', 'Gasolina', '185/65 R15', 'MICHELIN ENERGY', 32000.00, 'Disponible', 95.20, 320.00, 3.20, 0, '[]'),

-- 15. Toyota Hilux (2018)
('ASM-015', UUID(), 'Vehiculo', 'ASM-015', 'VIN-TYT-HL-015', 'Toyota', 'Hilux', 2018, '2.7L L4', '4x4', 'Manual', 'Diesel', '265/65 R17', 'BF GOODRICH KO3', 165000.00, 'Disponible', 88.30, 85.00, 9.40, 2, '[]'),

-- 16. Hilux Exploración (2023)
('ASM-016', UUID(), 'Vehiculo', 'ASM-016', 'VIN-TYT-EX-016', 'Toyota', 'Hilux Exploración', 2023, '2.8L Diesel', '4x4', 'Manual', 'Diesel', '265/65 R17', 'BF GOODRICH M/T', 34200.00, 'Disponible', 94.80, 150.00, 7.20, 1, '[]'),

-- 17. Hilux Planeación (2023)
('ASM-017', UUID(), 'Vehiculo', 'ASM-017', 'VIN-TYT-PL-017', 'Toyota', 'Hilux Planeación', 2023, '2.8L Diesel', '4x4', 'Manual', 'Diesel', '265/65 R17', 'BF GOODRICH KO3', 28900.00, 'Disponible', 95.10, 175.00, 5.80, 0, '[]'),

-- 18. Yaris Relaciones Comunitarias (2023)
('ASM-018', UUID(), 'Vehiculo', 'ASM-018', 'VIN-TYT-RC-018', 'Toyota', 'Yaris Rel. Com.', 2023, '1.5L Diesel', '4x2', 'Manual', 'Diesel', '185/60 R15', 'MICHELIN ENERGY', 42300.00, 'Disponible', 92.40, 190.00, 6.10, 1, '[]'),

-- 19. Seat Ateca (Versa Plata Prov) (2017) - THE PROV UNIT
('ASM-019', UUID(), 'Vehiculo', 'ASM-019', 'VIN-SEA-PR-019', 'Seat', 'Ateca (Provicional)', 2017, '1.4L TSI', '4x2', 'Automática', 'Gasolina', '215/55 R17', 'MICHELIN PRIMACY', 112000.00, 'En Mantenimiento', 65.20, 32.00, 18.50, 5, '[]'),

-- 20. Frision T8 Seguridad Patrimonial (2023)
('ASM-020', UUID(), 'Vehiculo', 'ASM-020', 'VIN-JAC-SP-020', 'JAC', 'Frision T8 Seg. Pat.', 2023, '2.0L Diesel', '4x4', 'Manual', 'Diesel', '265/60 R18', 'BF GOODRICH KO3', 54200.00, 'Disponible', 91.50, 140.00, 7.80, 1, '[]'),

-- 21. JAC X200 Administración (2024)
('ASM-021', UUID(), 'Vehiculo', 'ASM-021', 'VIN-JAC-X2-021', 'JAC', 'X200 Administración', 2024, '2.0L Diesel', '4x2', 'Manual', 'Gasolina', '195/70 R15C', 'YOKOHAMA BLUEARTH', 8900.00, 'Disponible', 98.20, 420.00, 1.50, 0, '[]'),

-- 22. Hilux Geología (2024)
('ASM-022', UUID(), 'Vehiculo', 'ASM-022', 'VIN-TYT-GE-022', 'Toyota', 'Hilux Geología', 2024, '2.8L Diesel', '4x4', 'Manual', 'Diesel', '265/65 R17', 'BF GOODRICH KO3', 12100.00, 'Disponible', 97.80, 205.00, 4.20, 0, '[]'),

-- 23. Hilux Operación Mina (2025)
('ASM-023', UUID(), 'Vehiculo', 'ASM-023', 'VIN-TYT-OM-023', 'Toyota', 'Hilux Operación Mina', 2025, '2.8L Diesel', '4x4', 'Automática', 'Diesel', '265/65 R17', 'BF GOODRICH KO3', 500.00, 'Disponible', 100.00, 500.00, 0.00, 0, '[]'),

-- 24. Chevrolet Silverado (2024) - EXTRA MOCK UNIT TO FILL 24
('ASM-024', UUID(), 'Vehiculo', 'ASM-024', 'VIN-CHV-SL-024', 'Chevrolet', 'Silverado 1500', 2024, '5.3L V8', '4x4', 'Automática', 'Gasolina', '265/70 R17', 'GOODYEAR WRANGLER', 13200.00, 'Disponible', 99.40, 480.00, 2.50, 0, '[]');

-- 🔱 ARCHON MASTER FUEL CONSOLIDATION v.39.9.9
-- Propósito: Implementar métricas reales de capacidad de combustible para analítica OPEX.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ESTRUCTURA: Asegurar columna con precisión industrial
-- Nota: Se posiciona estratégicamente después de capacidad_carga para mantener coherencia técnica.
ALTER TABLE fleet_units ADD COLUMN fuel_tank_capacity DECIMAL(10,2) DEFAULT 0.00 AFTER capacidad_carga;

-- 2. INYECCIÓN TÉCNICA: Valores reales según manual de fabricante (Litros)
UPDATE fleet_units SET fuel_tank_capacity = CASE 
    -- 🟢 PICKUPS & TRUCKS (Heavy Duty)
    WHEN id IN ('ASM-002', 'ASM-008', 'ASM-017', 'ASM-019', 'ASM-020', 'ASM-021', 'ASM-026', 'ASM-027') THEN 80.00  -- Toyota Hilux
    WHEN id IN ('ASM-012', 'ASM-013', 'ASM-014') THEN 75.00                                                   -- Mitsubishi L200
    WHEN id IN ('ASM-006', 'ASM-007') THEN 80.00                                                              -- Nissan NP300 / Frontier
    WHEN id = 'ASM-024' THEN 76.00                                                                            -- JAC Frison T8
    WHEN id = 'ASM-011' THEN 197.00                                                                           -- RAM 4000 (Chasis)
    
    -- 🔵 LIGHT ASSETS & TRANSPORT
    WHEN id = 'ASM-025' THEN 65.00                                                                            -- JAC X200
    WHEN id = 'ASM-016' THEN 55.00                                                                            -- RAM 700 (Fiat Strada)
    WHEN id = 'ASM-023' THEN 50.00                                                                            -- Seat Ateca
    WHEN id IN ('ASM-015', 'ASM-022') THEN 42.00                                                              -- Toyota Yaris
    WHEN id = 'ASM-018' THEN 45.00                                                                            -- Kia Rio
    WHEN id = 'ASM-009' THEN 41.00                                                                            -- Nissan Versa
    WHEN id = 'ASM-010' THEN 39.00                                                                            -- Chevrolet Aveo
    
    ELSE fuel_tank_capacity 
END;

SET FOREIGN_KEY_CHECKS = 1;

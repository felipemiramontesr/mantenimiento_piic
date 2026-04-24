-- =============================================================================
-- Migration: 026 - Trimestral ENUM Patch
-- Architecture: Archon Sovereign v37.2.4
-- Goal: Fixes legacy ENUM truncation for 'Trimestral' & re-secures data purity.
-- =============================================================================

-- 1. Actualización estructural del ENUM físico
ALTER TABLE fleet_units 
MODIFY COLUMN maintenance_frequency ENUM('Diaria', 'Semanal', 'Mensual', 'Trimestral', 'Bimestral', 'Semestral', 'Anual') DEFAULT 'Mensual';

-- 2. Retro-inyección curativa a las unidades truncadas durante el Día Cero
UPDATE fleet_units 
SET maintenance_frequency = 'Trimestral' 
WHERE maintenance_usage_freq_id = 1 AND maintenance_frequency = '';

-- =============================================================================
-- SCRIPT FINALIZADO
-- =============================================================================

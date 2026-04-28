-- 🔱 ARCHON PURIFICATION PATCH v.39.9.4.0
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Forzar Tipo Vehículo a toda la flota (Limpiar iconos de maquinaria)
UPDATE fleet_units SET asset_type_id = 1;

-- 2. Corregir modelo Kia Rio (ASM-018)
-- Buscamos el ID de RIO en common_catalogs si existe, sino lo forzamos.
UPDATE fleet_units SET modelo = 'RIO' WHERE id = 'ASM-018';

-- 3. Asegurar RAM 4000
UPDATE fleet_units SET model_id = (SELECT id FROM common_catalogs WHERE code = 'M_RAM_4000' LIMIT 1), modelo = '4000' WHERE id = 'ASM-011';

SET FOREIGN_KEY_CHECKS = 1;

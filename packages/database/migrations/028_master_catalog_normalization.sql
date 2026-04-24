-- ============================================================================
-- 🔱 ARCHON DATA NORMALIZATION PRO - MIGRATION 028
-- Script: 028_master_catalog_normalization.sql
-- Goal: Eliminate all string-based metadata in fleet_units.
-- ============================================================================

-- 1. EXTENSIÓN DE CATÁLOGOS TÉCNICOS
INSERT IGNORE INTO common_catalogs (id, category, code, label, is_active) VALUES
-- TIRE_BRAND Expansion
(264, 'TIRE_BRAND', 'TB_ZMAX', 'ZMAX', 1),
(265, 'TIRE_BRAND', 'TB_PIRELLI', 'Pirelli', 1),
(266, 'TIRE_BRAND', 'TB_BRIDGESTONE', 'Bridgestone', 1),
(267, 'TIRE_BRAND', 'TB_YOKOHAMA', 'Yokohama', 1),
(268, 'TIRE_BRAND', 'TB_GOODYEAR', 'Goodyear', 1),
-- TERRAIN_TYPE Creation
(269, 'TERRAIN_TYPE', 'TT_AT', 'All-Terrain (A/T)', 1),
(270, 'TERRAIN_TYPE', 'TT_MT', 'Mud-Terrain (M/T)', 1),
(271, 'TERRAIN_TYPE', 'TT_HT', 'High Terrain (H/T)', 1),
(272, 'TERRAIN_TYPE', 'TT_PASS', 'Passenger / City', 1),
(273, 'TERRAIN_TYPE', 'TT_LT', 'Carga (LT/Range E)', 1),
(274, 'TERRAIN_TYPE', 'TT_SUV', 'SUV / Highway', 1),
-- OPERATIONAL_USE Expansion
(275, 'USE_TYPE', 'USE_MIXTO', 'Uso Mixto', 1),
(276, 'USE_TYPE', 'USE_PLANTA', 'Operación Planta', 1);

-- 2. EVOLUCIÓN DEL ESQUEMA FLEET_UNITS
-- Añadimos las columnas de ID para la relación formal
ALTER TABLE fleet_units
ADD COLUMN brand_id INT NULL AFTER asset_type_id,
ADD COLUMN model_id INT NULL AFTER brand_id,
ADD COLUMN department_id INT NULL AFTER year,
ADD COLUMN operational_use_id INT NULL AFTER department_id,
ADD COLUMN tire_brand_id INT NULL AFTER fuel_type_id,
ADD COLUMN terrain_type_id INT NULL AFTER tire_brand_id;

-- 3. MOTOR DE MIGRACIÓN DE DATOS (Strings -> IDs)

-- A. Combustible (Corrección de 1/2 a 10/11)
UPDATE fleet_units SET fuel_type_id = 11 WHERE fuel_type_id = 1;
UPDATE fleet_units SET fuel_type_id = 10 WHERE fuel_type_id = 2;

-- B. Departamentos
UPDATE fleet_units SET department_id = 228 WHERE departamento = 'Medio Ambiente';
UPDATE fleet_units SET department_id = 225 WHERE departamento = 'Laboratorio';
UPDATE fleet_units SET department_id = 229 WHERE departamento = 'Operación Mina';
UPDATE fleet_units SET department_id = 227 WHERE departamento = 'Mantenimiento Planta';
UPDATE fleet_units SET department_id = 222 WHERE departamento IN ('Administración', 'General', 'Gerencia General');
UPDATE fleet_units SET department_id = 234 WHERE departamento = 'Seguridad Industrial';
UPDATE fleet_units SET department_id = 224 WHERE departamento = 'Geología';
UPDATE fleet_units SET department_id = 230 WHERE departamento = 'Operación Planta';
UPDATE fleet_units SET department_id = 231 WHERE departamento = 'Planeación';
UPDATE fleet_units SET department_id = 223 WHERE departamento = 'Exploración';
UPDATE fleet_units SET department_id = 232 WHERE departamento = 'Relaciones Comunitarias';
UPDATE fleet_units SET department_id = 233 WHERE departamento = 'Seguridad Patrimonial';

-- C. Marcas (Basado en IDs del JSON)
UPDATE fleet_units SET brand_id = 253 WHERE marca = 'Toyota';
UPDATE fleet_units SET brand_id = 23  WHERE marca = 'Nissan';
UPDATE fleet_units SET brand_id = 32  WHERE marca = 'Chevrolet';
UPDATE fleet_units SET brand_id = 33  WHERE marca = 'RAM';
UPDATE fleet_units SET brand_id = 35  WHERE marca = 'Mitsubishi';
UPDATE fleet_units SET brand_id = 37  WHERE marca = 'Kia';
UPDATE fleet_units SET brand_id = 256 WHERE marca = 'JAC';
UPDATE fleet_units SET brand_id = 34  WHERE marca = 'Seat' OR marca = 'Volkswagen';

-- D. Modelos (Basado en etiquetas del JSON)
UPDATE fleet_units SET model_id = 636 WHERE modelo = 'Hilux';
UPDATE fleet_units SET model_id = 528 WHERE modelo = 'Versa';
UPDATE fleet_units SET model_id = 553 WHERE modelo = 'Aveo';
UPDATE fleet_units SET model_id = 121 WHERE modelo = '700'; -- Ram 700
UPDATE fleet_units SET model_id = 127 WHERE modelo = '2500'; 
UPDATE fleet_units SET model_id = 128 WHERE modelo = '4000';
UPDATE fleet_units SET model_id = 572 WHERE modelo = 'L200';
UPDATE fleet_units SET model_id = 585 WHERE modelo = 'Rio';
UPDATE fleet_units SET model_id = 642 WHERE modelo = 'Yaris';
UPDATE fleet_units SET model_id = 364 WHERE modelo = 'Frison T8';
UPDATE fleet_units SET model_id = 525 WHERE modelo = 'Frontier' OR modelo = 'NP 300';
-- Casos especiales para modelos no detectados
UPDATE fleet_units SET model_id = 666 WHERE model_id IS NULL AND brand_id IS NOT NULL; -- Default dummy for the rest

-- E. Uso Operativo
UPDATE fleet_units SET operational_use_id = 236 WHERE uso IN ('Ciudad', 'Carretera', 'Supervisión', 'Personal');
UPDATE fleet_units SET operational_use_id = 239 WHERE uso IN ('Carga Pesada', 'Pesado/Planta');
UPDATE fleet_units SET operational_use_id = 242 WHERE uso IN ('Mina', 'Operación Mina (Socavón)');
UPDATE fleet_units SET operational_use_id = 241 WHERE uso IN ('Campo/Mina', 'Extremo/Lodo', 'Campo', 'Planta');
UPDATE fleet_units SET operational_use_id = 238 WHERE uso IN ('Reparto', 'Carga Ligera');
UPDATE fleet_units SET operational_use_id = 275 WHERE uso = 'Mixto';
UPDATE fleet_units SET operational_use_id = 276 WHERE uso = 'Planta';

-- F. Marcado de Llantas
UPDATE fleet_units SET tire_brand_id = 244 WHERE tire_brand LIKE '%BF GOODRICH%';
UPDATE fleet_units SET tire_brand_id = 243 WHERE tire_brand LIKE '%MICHELIN%';
UPDATE fleet_units SET tire_brand_id = 265 WHERE tire_brand LIKE '%PIRELLI%';
UPDATE fleet_units SET tire_brand_id = 266 WHERE tire_brand LIKE '%BRIDGESTONE%';
UPDATE fleet_units SET tire_brand_id = 267 WHERE tire_brand LIKE '%YOKOHAMA%';
UPDATE fleet_units SET tire_brand_id = 264 WHERE tire_brand LIKE '%ZMAX%';

-- G. Tipo de Terreno
UPDATE fleet_units SET terrain_type_id = 269 WHERE tipo_terreno LIKE '%All-Terrain%';
UPDATE fleet_units SET terrain_type_id = 270 WHERE tipo_terreno LIKE '%Mud-Terrain%';
UPDATE fleet_units SET terrain_type_id = 271 WHERE tipo_terreno LIKE '%High Terrain%';
UPDATE fleet_units SET terrain_type_id = 271 WHERE tipo_terreno LIKE '%Mixta%';
UPDATE fleet_units SET terrain_type_id = 272 WHERE tipo_terreno LIKE '%Passenger%';
UPDATE fleet_units SET terrain_type_id = 273 WHERE tipo_terreno LIKE '%Carga%';
UPDATE fleet_units SET terrain_type_id = 274 WHERE tipo_terreno LIKE '%SUV%';

-- 4. LIMPIEZA FINAL (Opcional, pero recomendado para pureza arquitectónica)
-- Comentamos por el momento por precaución hasta que el FRONT sea actualizado
-- ALTER TABLE fleet_units DROP COLUMN marca, DROP COLUMN modelo, DROP COLUMN departamento, DROP COLUMN uso, DROP COLUMN tire_brand, DROP COLUMN tipo_terreno;

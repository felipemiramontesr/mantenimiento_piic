-- Migration 120: Fix charset — corrige labels corruptos de category='SPECIALTY'
-- FC: Archon_VIM_SpecialtiesUX v2 · Firmado: 2026-06-18
-- Invariante §9.7: toda migración inicia con SET NAMES utf8mb4
SET NAMES utf8mb4;

-- Corrige los 9 labels con acentos corruptos (insertados sin SET NAMES en migration 119)
UPDATE common_catalogs SET label = 'Transmisión'          WHERE category = 'SPECIALTY' AND code = 'TRANSMISION';
UPDATE common_catalogs SET label = 'Suspensión'           WHERE category = 'SPECIALTY' AND code = 'SUSPENSION';
UPDATE common_catalogs SET label = 'Dirección'            WHERE category = 'SPECIALTY' AND code = 'DIRECCION';
UPDATE common_catalogs SET label = 'Eléctrico'            WHERE category = 'SPECIALTY' AND code = 'ELECTRICO';
UPDATE common_catalogs SET label = 'Electrónica Automotriz' WHERE category = 'SPECIALTY' AND code = 'ELECTRONICA';
UPDATE common_catalogs SET label = 'Diagnóstico OBD'      WHERE category = 'SPECIALTY' AND code = 'DIAGNOSTICO_OBD';
UPDATE common_catalogs SET label = 'Hojalatería'          WHERE category = 'SPECIALTY' AND code = 'HOJALATERIA';
UPDATE common_catalogs SET label = 'Alineación y Balanceo' WHERE category = 'SPECIALTY' AND code = 'ALINEACION_BALANCEO';
UPDATE common_catalogs SET label = 'Híbridos y Eléctricos' WHERE category = 'SPECIALTY' AND code = 'HIBRIDOS_ELECTRICOS';

-- Query de auditoría: detecta caracteres corruptos en columnas label del catálogo
-- Ejecutar en cualquier momento para verificar integridad de charset:
-- SELECT id, category, code, label FROM common_catalogs WHERE label LIKE '%?%';

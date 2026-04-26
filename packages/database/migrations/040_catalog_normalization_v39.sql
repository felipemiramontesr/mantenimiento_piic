-- 🔱 Archon Alpha v.39.1.4 - "Sovereign Catalog Normalization & Purification"
-- Logic: Strategic de-duplication and foreign key redirection.
-- Purpose: Eliminating triplicated models and generic codes (T1, F1, C1) to ensure a high-precision industrial registry.

-- ── 1. REDIRECCIÓN DE UNIDADES ACTIVAS (fleet_units) ──────────────────────
-- Aseguramos que los registros actuales apunten a los nuevos IDs "Master".

-- NISSAN: Redirigir modelos viejos (56-75) al rango canónico (525-532)
UPDATE fleet_units SET model_id = 525 WHERE model_id BETWEEN 56 AND 62;
UPDATE fleet_units SET model_id = 526 WHERE model_id BETWEEN 63 AND 65;
UPDATE fleet_units SET model_id = 527 WHERE model_id BETWEEN 66 AND 68;
UPDATE fleet_units SET model_id = 528 WHERE model_id = 69;
UPDATE fleet_units SET model_id = 529 WHERE model_id = 70;
UPDATE fleet_units SET model_id = 530 WHERE model_id = 71;
UPDATE fleet_units SET model_id = 531 WHERE model_id = 72;
UPDATE fleet_units SET model_id = 532 WHERE model_id = 73;

-- TOYOTA: Redirigir modelos viejos y genéricos (25, 76, 290) al rango canónico (636-643)
UPDATE fleet_units SET model_id = 636 WHERE model_id IN (25, 76, 77, 290, 291);
UPDATE fleet_units SET model_id = 637 WHERE model_id IN (26, 292);
UPDATE fleet_units SET model_id = 639 WHERE model_id IN (27, 78, 79, 293);
UPDATE fleet_units SET model_id = 643 WHERE model_id IN (80, 294);
UPDATE fleet_units SET model_id = 641 WHERE model_id IN (82, 83, 295);
UPDATE fleet_units SET model_id = 640 WHERE model_id IN (81, 296);
UPDATE fleet_units SET model_id = 638 WHERE model_id IN (84, 297);

-- FORD: Redirigir hacia el rango canónico (533-542)
UPDATE fleet_units SET model_id = 533 WHERE model_id IN (92, 93, 94, 95, 307, 313);
UPDATE fleet_units SET model_id = 535 WHERE model_id IN (101, 102, 308);
UPDATE fleet_units SET model_id = 538 WHERE model_id IN (96, 97, 309);
UPDATE fleet_units SET model_id = 539 WHERE model_id IN (98, 99, 100, 310);
UPDATE fleet_units SET model_id = 541 WHERE model_id IN (106, 311);
UPDATE fleet_units SET model_id = 540 WHERE model_id IN (105, 314);

-- ── 2. ELIMINACIÓN DE DUPLICADOS Y CÓDIGOS GENÉRICOS ──────────────────────
-- Limpieza profunda de common_catalogs.

-- Eliminación de marcas duplicadas
UPDATE common_catalogs SET parent_id = 438 WHERE parent_id = 29; -- Komatsu
DELETE FROM common_catalogs WHERE id = 29;

-- Purga de modelos "Loser" (Duplicados antiguos)
DELETE FROM common_catalogs WHERE id BETWEEN 56 AND 108;   -- Nissan/Toyota/Ford viejos
DELETE FROM common_catalogs WHERE id BETWEEN 109 AND 140;  -- Chevy/RAM/VW viejos
DELETE FROM common_catalogs WHERE id BETWEEN 141 AND 169;  -- Camiones sin marca
DELETE FROM common_catalogs WHERE id BETWEEN 290 AND 317;  -- Códigos genéricos T1, F1, C1...
DELETE FROM common_catalogs WHERE id BETWEEN 318 AND 343;  -- Códigos genéricos V1, R1, K1...
DELETE FROM common_catalogs WHERE id BETWEEN 344 AND 377;  -- Códigos genéricos N1, B1, S1...
DELETE FROM common_catalogs WHERE id BETWEEN 378 AND 402;  -- Códigos genéricos W1, L1, I1...

-- ── 3. SANEAMIENTO FINAL ─────────────────────────────────────────────────

-- Eliminación de modelos huérfanos (sin marca vinculada) que sobrevivieron
DELETE FROM common_catalogs WHERE category = 'MODEL' AND (parent_id IS NULL OR parent_id NOT IN (SELECT id FROM (SELECT id FROM common_catalogs WHERE category = 'BRAND') as b));

-- Asegurar que todas las marcas industriales estén activas
UPDATE common_catalogs SET is_active = '1' WHERE category = 'BRAND';
UPDATE common_catalogs SET is_active = '1' WHERE category = 'ASSET_TYPE';

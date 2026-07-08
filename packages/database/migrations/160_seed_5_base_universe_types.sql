SET NAMES utf8mb4;

-- ============================================================
-- Migration 160: Seed 5 Base Universe Types (TSMS + ARCHONAUT)
-- FC 067 Universe_Onboarding_Foundations · Fase 2
-- PROTOCOLO_L.md V.6.14.2 · §24.2 (Tipos de Universo/Mutabilidad)
-- ============================================================
-- Dependencia: migration 151 aplicada (universe_types + superclusters_catalog
-- + universe_type_superclusters ya sembrados para FMS/MMS/TMS).
--
-- Qué hace:
--   1. Siembra 2 Universe Types nuevos: TSMS, ARCHONAUT (𝕌𝕋 crece por Ω — §24.2).
--   2. Blueprint TSMS = SC_sistema completo (5 SC) — igual a FMS/MMS/TMS,
--      modelo emergente sin diferenciador fijo (confirmado por Ω 2026-07-07).
--   3. Blueprint ARCHONAUT = únicamente FINANZAS (1 SC) — consumidor puro,
--      necesita gasto personal (FC 067 corrección de Ω), 0 supercúmulos
--      de negocio adicionales.
--
-- Idempotente: INSERT IGNORE + lookup por code (nunca hardcodea IDs, §23.1).
-- ============================================================

-- ------------------------------------------------------------
-- PASO 1: Nuevos Universe Types
-- ------------------------------------------------------------
INSERT IGNORE INTO universe_types (code, name, description) VALUES
  ('TSMS',      'Technical Service Manager System', 'Gestión de servicio técnico especializado — blueprint completo, diferenciación emergente'),
  ('ARCHONAUT', 'Archonaut / ARC Itinerante',        'Nodo consumidor individual — sin supercúmulos de negocio fijos salvo Finanzas (gasto personal); opera vía L_social y lattices efímeros de marketplace');

-- ------------------------------------------------------------
-- PASO 2: Blueprint TSMS — SC_sistema completo (5 SC), igual a FMS/MMS/TMS
-- ------------------------------------------------------------
INSERT IGNORE INTO universe_type_superclusters (universe_type_id, supercluster_id)
SELECT ut.id, sc.id
FROM   universe_types ut
CROSS JOIN superclusters_catalog sc
WHERE  ut.code = 'TSMS';

-- ------------------------------------------------------------
-- PASO 3: Blueprint ARCHONAUT — únicamente FINANZAS (1 SC)
-- ------------------------------------------------------------
INSERT IGNORE INTO universe_type_superclusters (universe_type_id, supercluster_id)
SELECT ut.id, sc.id
FROM   universe_types ut
JOIN   superclusters_catalog sc ON sc.code = 'FINANZAS'
WHERE  ut.code = 'ARCHONAUT';

-- ------------------------------------------------------------
-- Verificación (Scenarios 1-3 del FC — conteos agregados)
-- ------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM universe_types)                                              AS universe_types_total,
  (SELECT COUNT(*) FROM universe_type_superclusters uts
   JOIN universe_types ut ON ut.id = uts.universe_type_id WHERE ut.code = 'TSMS')     AS tsms_sc_count,
  (SELECT COUNT(*) FROM universe_type_superclusters uts
   JOIN universe_types ut ON ut.id = uts.universe_type_id WHERE ut.code = 'ARCHONAUT') AS archonaut_sc_count;

-- ============================================================
-- Migration 151: Cosmological Catalogs Base
-- FC23_Cosmological_Schema_Extension · Fase A
-- PROTOCOLO_L.md V.6.10.0 · §24.2/§24.3
-- ============================================================
-- Crea los catálogos maestros del sistema cosmológico:
--   universe_types            — tipos de Universo (𝕌𝕋₀)
--   superclusters_catalog     — catálogo SC_sistema (5 SCs)
--   universe_type_superclusters — blueprint M:N idéntico para 𝕌𝕋₀
-- Idempotente: CREATE TABLE IF NOT EXISTS + INSERT IGNORE
-- ============================================================

-- ------------------------------------------------------------
-- 1. universe_types
--    Catálogo de tipos de Universo — extensible solo por Ω
--    𝕌𝕋₀ = {FMS, MMS, TMS} · X es notación, no valor DB (§24.2)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universe_types (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(10)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_universe_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. superclusters_catalog
--    SC_sistema = {CRM, RASTREO, MANTENIMIENTO, FINANZAS, RRHH}
--    COMANDO ∉ SC_sistema — es Universo Observable (§24.9)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS superclusters_catalog (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(30)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  perm_prefix VARCHAR(20)  NOT NULL,
  description TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sc_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. universe_type_superclusters
--    Blueprint M:N — qué SCs tiene cada Universe Type por defecto
--    Blueprint IDÉNTICO para FMS/MMS/TMS = SC_sistema (§24.2)
--    GrayMan dota de SCs post-creación via universe_superclusters
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universe_type_superclusters (
  universe_type_id TINYINT UNSIGNED NOT NULL,
  supercluster_id  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (universe_type_id, supercluster_id),
  CONSTRAINT fk_uts_type FOREIGN KEY (universe_type_id)
    REFERENCES universe_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_uts_sc   FOREIGN KEY (supercluster_id)
    REFERENCES superclusters_catalog(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Datos maestros
-- ============================================================

-- Universe Types: exactamente 3 filas (𝕌𝕋₀)
INSERT IGNORE INTO universe_types (code, name, description) VALUES
  ('FMS', 'Fleet Management System',         'Gestión de flotillas: rastreo, mantenimiento, cumplimiento'),
  ('MMS', 'Mining Management System',        'Operaciones mineras: RRHH, rastreo, logística de equipos pesados'),
  ('TMS', 'Transportation Management System','Logística de transporte: rutas, CRM de carga, trazabilidad');

-- Superclusters Catalog: exactamente 5 filas (SC_sistema)
INSERT IGNORE INTO superclusters_catalog (code, name, perm_prefix, description) VALUES
  ('CRM',          'Gestión de Relaciones',    'crm',         'Directorio, contratos, pipeline comercial, campañas'),
  ('RASTREO',      'Rastreo y Rutas',          'fleet',       'GPS en tiempo real, rutas, telemetría, alertas de operación'),
  ('MANTENIMIENTO','Mantenimiento de Activos', 'maintenance', 'Preventivo, correctivo, OEE, MTBF, MTTR'),
  ('FINANZAS',     'Finanzas y TCO',           'financial',   'Transacciones, costos totales de operación, presupuestos'),
  ('RRHH',         'Recursos Humanos',         'users',       'Colaboradores, roles, asistencia, nómina');

-- Blueprints: CROSS JOIN — 15 filas idénticas (5 SCs × 3 tipos)
-- Lookup por code: nunca hardcodear IDs (§23.1 — idempotencia garantizada)
INSERT IGNORE INTO universe_type_superclusters (universe_type_id, supercluster_id)
SELECT ut.id, sc.id
FROM   universe_types ut
CROSS JOIN superclusters_catalog sc
WHERE  ut.code IN ('FMS', 'MMS', 'TMS');

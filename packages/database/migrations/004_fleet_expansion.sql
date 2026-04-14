-- =============================================================================
-- Migration: 004 - Fleet Asset Intelligence Expansion
-- Architecture: PIIC Sovereign Fleet Management System
-- Version: 7.1.0.0
-- Author: ArchonCore by Dreamtek
-- SAFE TO RUN: fleet_units, fleet_maintenance_logs, fleet_route_logs have 0 rows
-- =============================================================================

-- STEP 1: Drop dependent tables first (respecting FK constraint order)
DROP TABLE IF EXISTS fleet_maintenance_logs;
DROP TABLE IF EXISTS fleet_route_logs;
DROP TABLE IF EXISTS fleet_units;

-- =============================================================================
-- STEP 2: Create new expanded fleet_units table
-- =============================================================================
CREATE TABLE fleet_units (

  -- ── SYSTEM IDENTITY ─────────────────────────────────────────────────────────
  id          VARCHAR(10) NOT NULL,      -- Auto-generated: FL001, FL002...
  uuid        CHAR(36)    NOT NULL,       -- System Integrity UUID

  -- ── ASSET CLASSIFICATION (Level 1 - Root of cascade) ────────────────────────
  asset_type  ENUM('Vehiculo', 'Maquinaria') NOT NULL
              COMMENT 'Root classifier. Controls Marca and Modelo catalogs.',

  -- ── PRIMARY IDENTIFIERS ──────────────────────────────────────────────────────
  tag             VARCHAR(50)  NOT NULL  COMMENT 'Número Económico (e.g., PIIC-001)',
  numero_serie    VARCHAR(100)           COMMENT 'Alphanumeric Serial Number',

  -- ── VEHICLE / MACHINERY SPECIFICATION (Level 2 & 3 of cascade) ──────────────
  marca           VARCHAR(100) NOT NULL  COMMENT 'Brand — filtered by asset_type',
  modelo          VARCHAR(100) NOT NULL  COMMENT 'Model  — filtered by marca',
  year            INT          NOT NULL  COMMENT 'Manufacturing year',
  motor           VARCHAR(150)           COMMENT 'Engine description (e.g., 2.8L Diesel TDI)',

  -- ── MECHANICAL CONFIGURATION ─────────────────────────────────────────────────
  traccion        ENUM(
                    '4x2',
                    '4x4',
                    'Doble Tracción',
                    'AWD',
                    'Oruga',
                    'N/A'
                  ) NOT NULL DEFAULT 'N/A',

  transmision     ENUM(
                    'Automática',
                    'Estándar (Manual)',
                    'CVT',
                    'Hidrostática',
                    'N/A'
                  ) NOT NULL DEFAULT 'N/A',

  fuel_type       ENUM(
                    'Gasolina',
                    'Diesel',
                    'Eléctrico',
                    'Híbrido',
                    'N/A'
                  ) NOT NULL DEFAULT 'Diesel',

  -- ── TIRE INFORMATION ─────────────────────────────────────────────────────────
  tire_spec       VARCHAR(50)   COMMENT 'Tire size spec (e.g., 255/70 R15)',
  tire_brand      VARCHAR(100)  COMMENT 'Tire brand or model',

  -- ── OPERATIONAL DATA ─────────────────────────────────────────────────────────
  capacidad_carga VARCHAR(50)   COMMENT 'Load capacity (e.g., 3.5 Ton, 1.5 m3)',
  odometer        DECIMAL(12,2) NOT NULL DEFAULT 0.00
                  COMMENT 'km for Vehiculo, hrs for Maquinaria (Horómetro)',

  -- ── ORGANIZATION ─────────────────────────────────────────────────────────────
  sede                  VARCHAR(150) COMMENT 'Location / Base of operations',
  centro_mantenimiento  ENUM('PIIC', 'Archon Core') NOT NULL DEFAULT 'PIIC',

  -- ── LEGAL & COMPLIANCE DOCUMENTS ─────────────────────────────────────────────
  vigencia_seguro           DATE         COMMENT 'Insurance expiry date',
  vencimiento_verificacion  DATE         COMMENT 'Vehicle verification expiry date',
  tarjeta_circulacion       VARCHAR(100) COMMENT 'Circulation card folio or reference',

  -- ── STATUS & ASSIGNMENT ──────────────────────────────────────────────────────
  status ENUM(
    'Disponible',
    'En Ruta',
    'En Mantenimiento',
    'Descontinuada'
  ) NOT NULL DEFAULT 'Disponible',

  assigned_operator_id INT DEFAULT NULL,

  -- ── AUDIT ────────────────────────────────────────────────────────────────────
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- ── CONSTRAINTS ──────────────────────────────────────────────────────────────
  PRIMARY KEY (id),
  UNIQUE KEY uq_uuid          (uuid),
  UNIQUE KEY uq_tag           (tag),
  UNIQUE KEY uq_numero_serie  (numero_serie),

  FOREIGN KEY fk_operator (assigned_operator_id)
    REFERENCES users(id)
    ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Fleet Asset Intelligence v7.1.0.0 — PIIC Sovereign Registry';


-- =============================================================================
-- STEP 3: Recreate fleet_maintenance_logs (FK reset)
-- =============================================================================
CREATE TABLE fleet_maintenance_logs (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  unit_id               VARCHAR(10)   NOT NULL,
  service_date          DATE          NOT NULL,
  odometer_at_service   DECIMAL(12,2) NOT NULL
                        COMMENT 'km or hrs at time of service',
  service_type          VARCHAR(100)  NOT NULL,
  description           TEXT,
  cost                  DECIMAL(12,2),
  technician            VARCHAR(100),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY fk_mlog_unit (unit_id)
    REFERENCES fleet_units(id)
    ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- STEP 4: Recreate fleet_route_logs (FK reset)
-- =============================================================================
CREATE TABLE fleet_route_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  unit_id       VARCHAR(10)   NOT NULL,
  operator_id   INT           NOT NULL,
  origin        VARCHAR(150),
  destination   VARCHAR(150),
  start_time    DATETIME      NOT NULL,
  end_time      DATETIME,
  start_km      DECIMAL(12,2) NOT NULL
                COMMENT 'Start odometer / horómetro reading',
  end_km        DECIMAL(12,2)
                COMMENT 'End odometer / horómetro reading',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY fk_rlog_unit     (unit_id)     REFERENCES fleet_units(id) ON DELETE CASCADE,
  FOREIGN KEY fk_rlog_operator (operator_id) REFERENCES users(id)       ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- MIGRATION COMPLETE
-- Verify with: SHOW COLUMNS FROM fleet_units;
-- Expected: 27 columns including asset_type, tag, marca, modelo, numero_serie...
-- =============================================================================

-- Migration: 091 — UPA Work Orders tables
-- Creates upa_work_orders and upa_work_order_tasks for the Universal Process Archon
-- fleet maintenance pipeline (Phase 2 — Infra & Fastify).
--
-- Collation: utf8mb4_general_ci — matches fleet_units on Hostinger production.
-- FK constraints are present. If applying to an existing table created without FKs,
-- run the ALTER TABLE statements at the bottom of this file instead.

CREATE TABLE IF NOT EXISTS upa_work_orders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid          CHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  vehicle_id    VARCHAR(36) NOT NULL,
  fleet_type    ENUM('urban', 'mining') NOT NULL DEFAULT 'urban',
  status        ENUM('IN_PROGRESS', 'AWAITING_AUTH', 'CLOSED') NOT NULL DEFAULT 'IN_PROGRESS',
  pending_since DATETIME NULL,
  opened_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at     DATETIME NULL,
  CONSTRAINT fk_upa_wo_vehicle FOREIGN KEY (vehicle_id) REFERENCES fleet_units(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS upa_work_order_tasks (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_order_id   INT UNSIGNED NOT NULL,
  task_id         VARCHAR(100) NOT NULL,
  stage           ENUM('triage', 'minor_service', 'cascade', 'deferred', 'closure') NOT NULL,
  package_level   ENUM('10k', '20k', '30k', '50k') NULL,
  description     TEXT NOT NULL,
  status          ENUM('pending', 'completed', 'DEFERRED_FINANCIAL', 'N_A_STRUCTURAL') NOT NULL DEFAULT 'pending',
  evidence_urls   JSON NULL,
  evidence_notes  TEXT NULL,
  completed_at    DATETIME NULL,
  CONSTRAINT fk_upa_task_wo FOREIGN KEY (work_order_id) REFERENCES upa_work_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE INDEX IF NOT EXISTS idx_upa_wo_vehicle ON upa_work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_upa_wo_status  ON upa_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_upa_task_wo    ON upa_work_order_tasks(work_order_id);

-- ─── PATCH for tables already created without FK constraints ─────────────────
-- Run only if upa_work_orders already exists without the FK (prod patching):
--
-- ALTER TABLE upa_work_orders
--   ADD CONSTRAINT fk_upa_wo_vehicle
--   FOREIGN KEY (vehicle_id) REFERENCES fleet_units(id) ON DELETE RESTRICT;
--
-- ALTER TABLE upa_work_order_tasks
--   ADD CONSTRAINT fk_upa_task_wo
--   FOREIGN KEY (work_order_id) REFERENCES upa_work_orders(id) ON DELETE CASCADE;

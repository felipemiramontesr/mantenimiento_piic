-- Migration: 092 — Maintenance ↔ UPA Link
-- Adds upa_work_order_id and created_by_user_id to fleet_movements.
-- This enables the Accept/Reject workflow: OPEN → tech accepts → ACTIVE + UPA work order.
--
-- Apply to local (archon) and prod (u701509674_Mant_piic) after 091_upa_work_orders.sql.

ALTER TABLE fleet_movements
  ADD COLUMN upa_work_order_id  INT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN created_by_user_id INT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE fleet_movements
  ADD CONSTRAINT fk_fm_upa_work_order
    FOREIGN KEY (upa_work_order_id) REFERENCES upa_work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fm_upa_wo ON fleet_movements(upa_work_order_id);

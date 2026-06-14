-- ============================================================
-- Migration 106: Clean Test Users — Solo GrayMan (id=4)
-- Elimina todos los usuarios excepto el superusuario Archon.
-- Idempotent: safe to run multiple times.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM user_fleet_owners WHERE user_id != 4;
DELETE FROM user_roles WHERE user_id != 4;
DELETE FROM users WHERE id != 4;

SET FOREIGN_KEY_CHECKS = 1;

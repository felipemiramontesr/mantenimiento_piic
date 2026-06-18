-- ============================================================
-- Migration 117: Archon Master — Purga Quirúrgica de Datos Seed
-- ⚠️  PURGA DESTRUCTIVA — SOLO EJECUTAR EN DEV O CON "GO PURGA" EXPLÍCITO DE GRAYMAN
-- ⚠️  NUNCA INCLUIR EN PIPELINE CI AUTOMÁTICO
-- Context: Limpieza de datos ficticios previo al arranque del Multiverso Archon real.
--          Elimina datos operacionales/tenants. Conserva estructura, catálogos y Archon.
-- Idempotent: DELETE/TRUNCATE son seguros de repetir sobre datos ya vacíos.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── 1. Logs y auditoría ──────────────────────────────────────
DELETE FROM administrative_audit_logs;
DELETE FROM system_access_logs;
DELETE FROM unit_activity_logs;
DELETE FROM notifications_outbox;
DELETE FROM user_push_tokens;

-- ─── 2. Finanzas y rutas ─────────────────────────────────────
DELETE FROM financial_transactions;
DELETE FROM route_incidents;
DELETE FROM fleet_route_extensions;

-- ─── 3. Mantenimiento y UPA ──────────────────────────────────
DELETE FROM fleet_maintenance_details;
DELETE FROM fleet_maintenance_extensions;
DELETE FROM upa_work_order_tasks;
DELETE FROM upa_work_orders;

-- ─── 4. Movimientos y unidades ───────────────────────────────
DELETE FROM fleet_movements;
DELETE FROM fleet_units;

-- ─── 5. Áreas y permisos de área ─────────────────────────────
DELETE FROM area_permissions;
DELETE FROM areas;

-- ─── 6. Owners y membresías ──────────────────────────────────
DELETE FROM owner_service_links;
DELETE FROM owner_profiles;
DELETE FROM user_owner_membership;
DELETE FROM user_fleet_owners;
DELETE FROM owners;

-- ─── 7. Usuarios (conservar solo Archon role_id=0) ───────────
DELETE FROM user_roles WHERE role_id != 0;
DELETE FROM users WHERE role_id != 0;

-- ─── CONSERVADO INTACTO ───────────────────────────────────────
-- roles, permissions, role_permissions        (RBAC)
-- countries, states, municipalities,          (catálogos geográficos)
-- neighborhoods, common_catalogs
-- maintenance_tasks, maintenance_task_statuses (catálogos de mantenimiento)
-- maintenance_plan_tasks, maintenance_brand_rules
-- upa_task_catalog

SET FOREIGN_KEY_CHECKS = 1;

-- ─── Verificación post-purga ─────────────────────────────────
-- SELECT 'owners' AS tabla, COUNT(*) AS registros FROM owners
-- UNION SELECT 'fleet_units', COUNT(*) FROM fleet_units
-- UNION SELECT 'users (no Archon)', COUNT(*) FROM users WHERE role_id != 0
-- UNION SELECT 'financial_transactions', COUNT(*) FROM financial_transactions;
-- Todos deben retornar 0.

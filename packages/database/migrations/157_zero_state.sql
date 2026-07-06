-- ============================================================
-- 157_zero_state.sql — FC 062 F6 · Zero_State_GrayMan_Only (enmienda v1.2)
-- VACÍO TOTAL DEL MULTIVERSO: elimina TODOS los datos de negocio y
-- tenencia, preservando exclusivamente el Acceso GrayMan (Ω) y los
-- catálogos estructurales del sistema. IDEMPOTENTE (2ª ejecución = 0).
--
-- SE PRESERVA:
--   · users con rol Master (role_id = 0 ∨ user_roles.role_id = 0) — Ω
--     (+ sus user_roles y push tokens)
--   · roles · permissions · role_permissions
--   · cosmonaut_roles GLOBALES (tenant_id IS NULL) + sus permisos
--   · common_catalogs (excepto categoría FLEET_OWNER — filas de negocio)
--   · geografía: countries/states/municipalities/neighborhoods
--   · catálogos de mantenimiento: upa_task_catalog, maintenance_brand_rules,
--     maintenance_task_statuses, maintenance_tasks, maintenance_plan_tasks
--   · el esquema completo (solo se eliminan FILAS, jamás tablas)
--
-- SE ELIMINA (con backup zz_fc062f6_*):
--   · tenants/owners + perfiles + service links + memberships + specialties
--   · users no-master + sus roles/tokens/vínculos
--   · flota completa y TODO su historial (movements, rutas, checkpoints,
--     mantenimientos, incidentes, financials, work orders, telemetría, logs)
--   · áreas + permisos de área · notificaciones · logs de auditoría/acceso
--   · cosmonaut_roles custom + asignaciones · recalls
--
-- BACKUP PREVIO OBLIGATORIO: mysqldump COMPLETO del schema ANTES de
-- ejecutar (PROD: exclusivo de Ω, ventana §20):
--   mysqldump -u <user> -p --single-transaction <db> > backup_pre_157_$(date +%Y%m%d).sql
-- El backup zz_ interno es la segunda capa, no sustituye al dump.
--
-- FOREIGN_KEY_CHECKS=0 durante la purga (precedente migración 154):
-- el orden de borrado queda inmune a derivas del grafo FK entre entornos.
-- ESPEJO PROD: mismo archivo (usa DATABASE()). PROD: exclusivo de Ω (§18.1).
-- ============================================================

SET NAMES utf8mb4;

-- ─── 0 · Detección de tablas opcionales (deriva local↔PROD) ─────────

SET @has_telemetry := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'realtime_telemetry');
SET @has_activity := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'unit_activity_logs');
SET @has_upa_wo := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'upa_work_orders');
SET @has_upa_tasks := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'upa_work_order_tasks');
SET @has_maint_det := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_maintenance_details');
SET @has_maint_ext := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_maintenance_extensions');
SET @has_recalls := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalog_recalls');
SET @has_unit_recalls := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fleet_unit_recalls');
SET @has_outbox := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications_outbox');
SET @has_audit := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'administrative_audit_logs');
SET @has_access := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_access_logs');
SET @has_area_perm := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'area_permissions');
SET @has_areas := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'areas');
SET @has_specialties := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'owner_specialties');
SET @has_tsl := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_service_links');
SET @has_tprofiles := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_profiles');
SET @has_tum := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_user_memberships');
SET @has_tenants := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants');
SET @has_cra := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cosmonaut_role_assignments');
SET @has_crp := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cosmonaut_role_permissions');
SET @has_croles := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cosmonaut_roles');
SET @has_push := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_push_tokens');
SET @has_ufo := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_fleet_owners');

-- ─── 0b · Usuarios preservados (Acceso GrayMan = rol Master 0) ──────

DROP TEMPORARY TABLE IF EXISTS tmp_preserved_users;
CREATE TEMPORARY TABLE tmp_preserved_users (id INT PRIMARY KEY)
SELECT DISTINCT u.id FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = 0
WHERE u.role_id = 0 OR ur.role_id = 0;

-- ─── 1 · BACKUP zz_fc062f6_* (idempotente) ───────────────────────────

CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_users LIKE users;
INSERT IGNORE INTO zz_fc062f6_bak_users
SELECT * FROM users WHERE id NOT IN (SELECT id FROM tmp_preserved_users);

CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_fleet_units LIKE fleet_units;
INSERT IGNORE INTO zz_fc062f6_bak_fleet_units SELECT * FROM fleet_units;

CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_fleet_movements LIKE fleet_movements;
INSERT IGNORE INTO zz_fc062f6_bak_fleet_movements SELECT * FROM fleet_movements;

CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_route_extensions LIKE fleet_route_extensions;
INSERT IGNORE INTO zz_fc062f6_bak_route_extensions SELECT * FROM fleet_route_extensions;

CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_route_checkpoints LIKE fleet_route_checkpoints;
INSERT IGNORE INTO zz_fc062f6_bak_route_checkpoints SELECT * FROM fleet_route_checkpoints;

CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_route_incidents LIKE route_incidents;
INSERT IGNORE INTO zz_fc062f6_bak_route_incidents SELECT * FROM route_incidents;

CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_financial_transactions LIKE financial_transactions;
INSERT IGNORE INTO zz_fc062f6_bak_financial_transactions SELECT * FROM financial_transactions;

-- Backups guardeados (tablas que pueden no existir en un entorno)

SET @sql := IF(@has_tenants = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_tenants LIKE tenants', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tenants = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_tenants SELECT * FROM tenants', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_tprofiles = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_tenant_profiles LIKE tenant_profiles', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tprofiles = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_tenant_profiles SELECT * FROM tenant_profiles', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_tum = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_tenant_user_memberships LIKE tenant_user_memberships', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tum = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_tenant_user_memberships SELECT * FROM tenant_user_memberships', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_tsl = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_tenant_service_links LIKE tenant_service_links', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tsl = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_tenant_service_links SELECT * FROM tenant_service_links', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_specialties = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_owner_specialties LIKE owner_specialties', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_specialties = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_owner_specialties SELECT * FROM owner_specialties', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_areas = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_areas LIKE areas', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_areas = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_areas SELECT * FROM areas', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_outbox = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_notifications_outbox LIKE notifications_outbox', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_outbox = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_notifications_outbox SELECT * FROM notifications_outbox', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_upa_wo = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_upa_work_orders LIKE upa_work_orders', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_upa_wo = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_upa_work_orders SELECT * FROM upa_work_orders', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_upa_tasks = 1, 'CREATE TABLE IF NOT EXISTS zz_fc062f6_bak_upa_work_order_tasks LIKE upa_work_order_tasks', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_upa_tasks = 1, 'INSERT IGNORE INTO zz_fc062f6_bak_upa_work_order_tasks SELECT * FROM upa_work_order_tasks', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 2 · PURGA (FK checks OFF — precedente 154; backups ya tomados) ──

SET FOREIGN_KEY_CHECKS = 0;

-- Cadena de flota e historial
SET @sql := IF(@has_maint_det = 1, 'DELETE FROM fleet_maintenance_details', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_maint_ext = 1, 'DELETE FROM fleet_maintenance_extensions', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
DELETE FROM route_incidents;
DELETE FROM fleet_route_checkpoints;
DELETE FROM fleet_route_extensions;
DELETE FROM fleet_movements;
SET @sql := IF(@has_upa_tasks = 1, 'DELETE FROM upa_work_order_tasks', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_upa_wo = 1, 'DELETE FROM upa_work_orders', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_telemetry = 1, 'DELETE FROM realtime_telemetry', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_activity = 1, 'DELETE FROM unit_activity_logs', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
DELETE FROM financial_transactions;
SET @sql := IF(@has_unit_recalls = 1, 'DELETE FROM fleet_unit_recalls', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_recalls = 1, 'DELETE FROM catalog_recalls', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
DELETE FROM fleet_units;

-- Notificaciones y logs
SET @sql := IF(@has_outbox = 1, 'DELETE FROM notifications_outbox', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_audit = 1, 'DELETE FROM administrative_audit_logs', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_access = 1, 'DELETE FROM system_access_logs', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Cosmonautas: asignaciones + roles custom (R_universe); R_global se preserva
SET @sql := IF(@has_cra = 1, 'DELETE FROM cosmonaut_role_assignments', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_crp = 1 AND @has_croles = 1, 'DELETE crp FROM cosmonaut_role_permissions crp JOIN cosmonaut_roles cr ON cr.id = crp.role_id WHERE cr.tenant_id IS NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_croles = 1, 'DELETE FROM cosmonaut_roles WHERE tenant_id IS NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_croles = 1, 'UPDATE cosmonaut_roles SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM tmp_preserved_users)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Áreas y tenencia
SET @sql := IF(@has_area_perm = 1, 'DELETE FROM area_permissions', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_areas = 1, 'DELETE FROM areas', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_specialties = 1, 'DELETE FROM owner_specialties', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tsl = 1, 'DELETE FROM tenant_service_links', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tprofiles = 1, 'DELETE FROM tenant_profiles', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tum = 1, 'DELETE FROM tenant_user_memberships', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_tenants = 1, 'DELETE FROM tenants', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Filas de negocio en catálogo común (owners legacy)
DELETE FROM common_catalogs WHERE category = 'FLEET_OWNER';

-- Usuarios: todo excepto el Acceso GrayMan
SET @sql := IF(@has_push = 1, 'DELETE FROM user_push_tokens WHERE user_id NOT IN (SELECT id FROM tmp_preserved_users)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF(@has_ufo = 1, 'DELETE FROM user_fleet_owners', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM tmp_preserved_users);
DELETE FROM users WHERE id NOT IN (SELECT id FROM tmp_preserved_users);

SET FOREIGN_KEY_CHECKS = 1;

DROP TEMPORARY TABLE IF EXISTS tmp_preserved_users;

-- ─── 3 · VERIFICACIÓN (zero-state + Ω intacto + catálogos vivos) ─────

SELECT
  (SELECT COUNT(*) FROM fleet_units) AS units,
  (SELECT COUNT(*) FROM fleet_movements) AS movements,
  (SELECT COUNT(*) FROM financial_transactions) AS financials,
  (SELECT COUNT(*) FROM route_incidents) AS incidents,
  (SELECT COUNT(*) FROM common_catalogs WHERE category = 'FLEET_OWNER') AS fleet_owner_rows,
  (SELECT COUNT(*) FROM users WHERE role_id <> 0
     AND id NOT IN (SELECT user_id FROM user_roles WHERE role_id = 0)) AS non_master_users,
  (SELECT COUNT(*) FROM users WHERE role_id = 0
     OR id IN (SELECT user_id FROM user_roles WHERE role_id = 0)) AS master_users,
  (SELECT COUNT(*) FROM roles) AS roles_catalog,
  (SELECT COUNT(*) FROM common_catalogs) AS system_catalogs;
-- Esperado: units..non_master_users = 0 · master_users ≥ 1 (GrayMan)
--           · roles_catalog > 0 · system_catalogs > 0

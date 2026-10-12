-- ============================================================
-- Migration 187: permisos operativos del rol MU — FC211 F1 (MU_Operational_Permissions_Migration_187) · 2026-10-12
-- Context: FC211 (O 583_AN · R 584_AN · SC de Ω 2026-10-12; OLR Sí). Decisiones D12, D14 y D15 de Ω.
--
-- El Master of Universe tiene todas las capacidades de su Universo, solo por debajo de GrayMan. El rol
-- global MU (cosmonaut_roles.name = 'MU', tenant_id IS NULL) recibe todo slug existente de los prefijos
-- operativos reales del catálogo `permissions`: fleet:, maint:, workorder:, route:, intelligence:,
-- finance:, financial:, geolocation: y crm:. Incluye los de descifrado de fleet: (placas, VIN, tarjeta).
-- Quedan fuera, exclusivos de GrayMan Ω (D14): admin:tenant:*, users:collaborator:delete y el comodín '*'.
-- En tiempo de ejecución el techo de FC193 (applyPermissionCeiling) retira lo que dependa de un
-- supercúmulo que el Universo no tenga ACTIVE.
--
-- Los permisos son del ROL: alcanza a todo MU, existente o futuro, en su siguiente sesión o refresco.
-- Solo DML: no cambia la huella de esquema. La paridad local ↔ prod se comprueba con el conteo final.
-- Idempotente: INSERT IGNORE sobre la llave primaria (role_id, permission_id) (R 582_AN).
-- Aserciones antes del COMMIT: existe exactamente un rol MU global; no le falta ningún slug operativo;
-- no tiene ninguno de los exclusivos de Ω. Si una falla, la consulta revienta y la TX se revierte.
-- Orden: PRIMERO local (scripts/dbMigrateLocal.ts), DESPUÉS prod (db-migrations.yml, despacho de Ω).
-- ============================================================

SET NAMES utf8mb4;

START TRANSACTION;

-- Aserción 1: existe exactamente un rol MU global.
SET @fc211_mu_roles := (SELECT COUNT(*) FROM cosmonaut_roles WHERE name = 'MU' AND tenant_id IS NULL);
SET @fc211_assert := IF(@fc211_mu_roles = 1, 'DO 0', 'SELECT 1 FROM fc211_assertion_failed_mu_role_not_unique');
PREPARE fc211_stmt FROM @fc211_assert;
EXECUTE fc211_stmt;
DEALLOCATE PREPARE fc211_stmt;

INSERT IGNORE INTO cosmonaut_role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM cosmonaut_roles cr
JOIN permissions p
  ON p.slug LIKE 'fleet:%'
  OR p.slug LIKE 'maint:%'
  OR p.slug LIKE 'workorder:%'
  OR p.slug LIKE 'route:%'
  OR p.slug LIKE 'intelligence:%'
  OR p.slug LIKE 'finance:%'
  OR p.slug LIKE 'financial:%'
  OR p.slug LIKE 'geolocation:%'
  OR p.slug LIKE 'crm:%'
WHERE cr.name = 'MU' AND cr.tenant_id IS NULL;

-- Aserción 2: al rol MU no le falta ningún slug de los prefijos operativos.
SET @fc211_missing := (
  SELECT COUNT(*) FROM permissions p
  WHERE (p.slug LIKE 'fleet:%' OR p.slug LIKE 'maint:%' OR p.slug LIKE 'workorder:%'
         OR p.slug LIKE 'route:%' OR p.slug LIKE 'intelligence:%' OR p.slug LIKE 'finance:%'
         OR p.slug LIKE 'financial:%' OR p.slug LIKE 'geolocation:%' OR p.slug LIKE 'crm:%')
    AND NOT EXISTS (
      SELECT 1 FROM cosmonaut_role_permissions rp
      JOIN cosmonaut_roles cr ON cr.id = rp.role_id
      WHERE rp.permission_id = p.id AND cr.name = 'MU' AND cr.tenant_id IS NULL
    )
);
SET @fc211_assert := IF(@fc211_missing = 0, 'DO 0', 'SELECT 1 FROM fc211_assertion_failed_mu_missing_operational_permission');
PREPARE fc211_stmt FROM @fc211_assert;
EXECUTE fc211_stmt;
DEALLOCATE PREPARE fc211_stmt;

-- Aserción 3: el rol MU no tiene ningún permiso exclusivo de GrayMan Ω (D14).
SET @fc211_sovereign := (
  SELECT COUNT(*) FROM cosmonaut_role_permissions rp
  JOIN cosmonaut_roles cr ON cr.id = rp.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE cr.name = 'MU' AND cr.tenant_id IS NULL
    AND (p.slug LIKE 'admin:tenant:%' OR p.slug = 'users:collaborator:delete' OR p.slug = '*')
);
SET @fc211_assert := IF(@fc211_sovereign = 0, 'DO 0', 'SELECT 1 FROM fc211_assertion_failed_mu_has_sovereign_permission');
PREPARE fc211_stmt FROM @fc211_assert;
EXECUTE fc211_stmt;
DEALLOCATE PREPARE fc211_stmt;

COMMIT;

-- Conteos para la paridad local ↔ prod (solo agregados): total del rol MU y cuántos son operativos.
SELECT COUNT(*) AS mu_permissions_total,
       SUM(p.slug LIKE 'fleet:%' OR p.slug LIKE 'maint:%' OR p.slug LIKE 'workorder:%'
           OR p.slug LIKE 'route:%' OR p.slug LIKE 'intelligence:%' OR p.slug LIKE 'finance:%'
           OR p.slug LIKE 'financial:%' OR p.slug LIKE 'geolocation:%' OR p.slug LIKE 'crm:%')
         AS mu_permissions_operational
FROM cosmonaut_role_permissions rp
JOIN cosmonaut_roles cr ON cr.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE cr.name = 'MU' AND cr.tenant_id IS NULL;

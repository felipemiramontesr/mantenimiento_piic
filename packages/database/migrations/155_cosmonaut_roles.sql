-- ============================================================
-- Migration 155: Cosmonaut Roles System — FC24 FaseB
-- Context: Crea el sistema de Roles Híbrido (§24.13 L V.6.11.0):
--          cosmonaut_roles    — catálogo (tenant_id NULL = R_global · NOT NULL = R_universe)
--          cosmonaut_role_permissions — M:N roles ↔ permissions (migration 150 slugs)
--          cosmonaut_role_assignments — M:N (user,tenant) ↔ roles con scope por Universo
--          Seed de 4 R_global base (Mecánico · Supervisor · Operador · Auditor)
-- FK note : permission_id referencia permissions(id) — NO permission_catalog (OQ-2 AG)
-- Idempotent: CREATE TABLE IF NOT EXISTS + WHERE NOT EXISTS para seed R_global
--             INSERT IGNORE en cosmonaut_role_permissions (PK compuesta)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Tabla 1: cosmonaut_roles ─────────────────────────────────────────────────
-- tenant_id = NULL → R_global (Ω-owned, disponible en todos los Universos)
-- tenant_id = X   → R_universe (creado por MU del Universo X)
CREATE TABLE IF NOT EXISTS cosmonaut_roles (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tenant_id   INT           NULL DEFAULT NULL,
  name        VARCHAR(100)  NOT NULL,
  description TEXT          NULL,
  is_system   TINYINT(1)    NOT NULL DEFAULT 0,
  created_by  INT           NULL DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_name_tenant (tenant_id, name),
  CONSTRAINT fk_cr_tenant     FOREIGN KEY (tenant_id)  REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_cr_created_by FOREIGN KEY (created_by) REFERENCES users(id)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Tabla 2: cosmonaut_role_permissions ─────────────────────────────────────
-- M:N roles ↔ permissions — FK a tabla física permissions (migration 001/150)
CREATE TABLE IF NOT EXISTS cosmonaut_role_permissions (
  role_id       INT UNSIGNED NOT NULL,
  permission_id INT          NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_crp_role FOREIGN KEY (role_id)       REFERENCES cosmonaut_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_crp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Tabla 3: cosmonaut_role_assignments ─────────────────────────────────────
-- M:N (user, tenant) ↔ roles — scoped por Universo (tenant_id)
-- tenant_id = NULL → asignación global de Ω (R_global visible en todos los Universos)
-- tenant_id = X   → asignación en Universo X (R_universe del MU de ese Universo)
-- UNIQUE(user_id, role_id, tenant_id) — mismo rol no se asigna dos veces en el mismo scope
CREATE TABLE IF NOT EXISTS cosmonaut_role_assignments (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT             NOT NULL,
  role_id      INT UNSIGNED    NOT NULL,
  tenant_id    INT             NULL DEFAULT NULL,
  assigned_by  INT             NULL DEFAULT NULL,
  assigned_at  DATETIME        NOT NULL DEFAULT NOW(),
  revoked_at   DATETIME        NULL DEFAULT NULL,
  revoked_by   INT             NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment_scope (user_id, role_id, tenant_id),
  CONSTRAINT fk_cra_user     FOREIGN KEY (user_id)    REFERENCES users(id)           ON DELETE CASCADE,
  CONSTRAINT fk_cra_role     FOREIGN KEY (role_id)    REFERENCES cosmonaut_roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_cra_tenant   FOREIGN KEY (tenant_id)  REFERENCES tenants(id)         ON DELETE CASCADE,
  CONSTRAINT fk_cra_assigner FOREIGN KEY (assigned_by) REFERENCES users(id)          ON DELETE SET NULL,
  CONSTRAINT fk_cra_revoker  FOREIGN KEY (revoked_by)  REFERENCES users(id)          ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Seed R_global — 4 Roles base de Ω ──────────────────────────────────────
-- WHERE NOT EXISTS: UNIQUE INDEX no protege NULLs en MySQL 5.7 (NULL != NULL en índice)
-- is_system=1: flag inmutable — solo Ω puede modificar R_global (I9 §24.13)
INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system)
SELECT NULL, 'Mecánico', 'Ejecución de mantenimientos preventivos y correctivos', 1
WHERE NOT EXISTS (SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'Mecánico');

INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system)
SELECT NULL, 'Supervisor', 'Supervisión operativa de flotas, mantenimiento y reportes', 1
WHERE NOT EXISTS (SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'Supervisor');

INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system)
SELECT NULL, 'Operador', 'Operación diaria de unidades y rutas', 1
WHERE NOT EXISTS (SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'Operador');

INSERT INTO cosmonaut_roles (tenant_id, name, description, is_system)
SELECT NULL, 'Auditor', 'Lectura de reportes y registros operativos completos', 1
WHERE NOT EXISTS (SELECT 1 FROM cosmonaut_roles WHERE tenant_id IS NULL AND name = 'Auditor');

-- ─── Seed cosmonaut_role_permissions — R_global ───────────────────────────────
-- Slugs reales de migration 150 · INSERT IGNORE (PK compuesta, idempotente)
INSERT IGNORE INTO cosmonaut_role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM cosmonaut_roles cr
JOIN permissions p ON (
  (cr.name = 'Mecánico' AND p.slug IN (
    'maint:record:view:any',
    'maint:record:create',
    'maint:record:edit:own',
    'maint:template:view',
    'maint:forecast:view',
    'workorder:view:any',
    'workorder:create',
    'workorder:edit:own',
    'workorder:close',
    'workorder:task:manage',
    'fleet:unit:view:any',
    'fleet:catalog:view',
    'notifications:view:own',
    'document:file:download'
  )) OR
  (cr.name = 'Supervisor' AND p.slug IN (
    'maint:record:view:any',
    'maint:record:create',
    'maint:record:edit:any',
    'maint:record:delete:any',
    'maint:template:view',
    'maint:template:manage',
    'maint:forecast:view',
    'maint:report:export',
    'workorder:view:any',
    'workorder:create',
    'workorder:edit:any',
    'workorder:close',
    'workorder:task:manage',
    'workorder:delete',
    'fleet:unit:view:any',
    'fleet:unit:edit:any',
    'fleet:catalog:view',
    'intelligence:recall:view',
    'intelligence:scorecard:view',
    'alert:view:any',
    'alert:manage:own',
    'users:collaborator:view',
    'servicecenters:view',
    'areas:view',
    'notifications:view:own',
    'document:file:upload',
    'document:file:download'
  )) OR
  (cr.name = 'Operador' AND p.slug IN (
    'fleet:unit:view:any',
    'fleet:unit:node:view',
    'fleet:catalog:view',
    'route:record:view:any',
    'route:record:create',
    'route:checklist:submit',
    'route:checklist:view',
    'alert:view:own',
    'workorder:view:own',
    'workorder:create',
    'geolocation:view:own',
    'notifications:view:own',
    'users:collaborator:edit:own',
    'users:profile-image:manage'
  )) OR
  (cr.name = 'Auditor' AND p.slug IN (
    'fleet:unit:view:any',
    'fleet:unit:export',
    'maint:record:view:any',
    'maint:report:export',
    'finance:dashboard:view:any',
    'finance:transaction:view:any',
    'finance:report:export',
    'intelligence:tco:view',
    'intelligence:tco:export',
    'intelligence:report:export',
    'admin:audit:view',
    'security:audit:view',
    'workorder:view:any',
    'alert:view:any',
    'notifications:view:own',
    'document:file:download'
  ))
)
WHERE cr.tenant_id IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── Verification queries (ejecutar manualmente post-apply) ──────────────────
-- Roles globales creados:
-- SELECT id, name, is_system FROM cosmonaut_roles WHERE tenant_id IS NULL;
-- Expected: 4 rows (Mecánico · Supervisor · Operador · Auditor)

-- Permisos asignados por rol:
-- SELECT cr.name, COUNT(*) AS permisos
-- FROM cosmonaut_role_permissions crp
-- JOIN cosmonaut_roles cr ON cr.id = crp.role_id
-- GROUP BY cr.name;

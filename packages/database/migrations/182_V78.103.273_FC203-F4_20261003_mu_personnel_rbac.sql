-- ============================================================
-- Migration 182: el Master of Universe ve "Personal" — FC203 F4 · 2026-10-03
--   (QA_Session_1_Remediation_And_Mu_Personnel_RBAC)
-- Context: QA manual, sesión 1, caso C3 (C3-OBS1). El MU recién vinculado no veía la entrada
--          "Personal" del menú (Sidebar.tsx la muestra con `users:collaborator:view`) y no tenía en
--          la web cómo consultar ni editar a su equipo. O 474_AN · R 475/476/477/478_AN (enmienda
--          least-privilege, verificación de driver 2026-10-03 11:36).
--
-- Otorga al rol global MU (`cosmonaut_roles`, tenant_id IS NULL, name = 'MU') UN solo permiso:
--   users:collaborator:view  (la lista y el PATCH de /auth/users ya pasan por user:admin, alias de
--                             admin:role:edit, que el MU tiene desde la 170).
-- NO otorga create / edit:any / delete: ningún endpoint los consume (el alta murió en FC082 F0c y la
-- baja es exclusiva de Ω por FC159 R3b). NO otorga admin:tenant:*, fleet, maint ni finance.
-- `users:collaborator:view` es núcleo: el techo de FC193 (permissionCeiling.ts) no lo filtra.
--
-- Solo DML de catálogo RBAC, sin DDL: la huella de esquema (Regla 23) no cambia. No reescribe la 170.
-- Idempotente: INSERT IGNORE sobre la PK (role_id, permission_id). Orden: PRIMERO local, DESPUÉS prod.
-- ============================================================

INSERT IGNORE INTO cosmonaut_role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM cosmonaut_roles cr
JOIN permissions p ON p.slug = 'users:collaborator:view'
WHERE cr.tenant_id IS NULL
  AND cr.name = 'MU';

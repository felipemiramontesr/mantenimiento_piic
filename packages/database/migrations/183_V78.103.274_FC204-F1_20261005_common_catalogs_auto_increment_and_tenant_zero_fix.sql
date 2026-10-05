-- ============================================================
-- Migration 183: AUTO_INCREMENT en common_catalogs y remediación del tenant 0 — FC204 F1 · 2026-10-05
--   (Common_Catalogs_Auto_Increment_And_Tenant_Zero_Remediation)
-- Context: QA manual, B3-DEF2. `common_catalogs.id` no tiene AUTO_INCREMENT (local y prod), así que
--          `mintUniverseTenantId` recibió insertId 0 y el Universo quedó con id 0: no se puede renombrar,
--          destruir ni crear otro (Duplicate entry '0' for key 'PRIMARY'). O 482_AN · R 483/484/485_AN.
--
-- Orden (485_AN): las FK son ON UPDATE RESTRICT, así que no hay UPDATE de la PK. Dentro de UNA TX:
--   a. NEW_ID = máximo de common_catalogs.id, tenants.id y fleet_units.ownerId (sin FK) + 1.
--   b/c. Copia de la fila 0 de common_catalogs y de tenants con id = NEW_ID. `tenants.handle` es UNIQUE:
--        la copia lleva un handle temporal y recupera el original después de borrar el 0.
--   d. Repunteo de 0 a NEW_ID de cada columna dependiente (lista sellable sacada de information_schema).
--   e. Aserción: cero referencias a 0; si queda alguna, la consulta falla, el cliente mysql se detiene y la
--      TX sin COMMIT se revierte al cerrar la conexión.
--   f. DELETE del 0 (ya no lo referencia nadie: ni CASCADE ni RESTRICT se disparan).
--   g. Después del COMMIT, el ALTER (el DDL hace commit implícito). InnoDB fija el contador en MAX(id)+1.
-- Todo es condicional: sin fila 0 (base local actual) la parte de datos no cambia nada y solo corre el ALTER.
-- `tenants` sigue sin AUTO_INCREMENT (diseño 107). No reescribe 007, 107 ni 149: las vistas de la 149
-- (owner_profiles, owner_service_links, user_owner_membership, owners) se cubren por sus tablas base.
-- La huella de esquema (Regla 23) cambia por el EXTRA auto_increment. Orden: PRIMERO local, DESPUÉS prod.
-- ============================================================

SET NAMES utf8mb4;

START TRANSACTION;

SET @fc204_has_zero := (SELECT COUNT(*) FROM common_catalogs WHERE id = 0)
                     + (SELECT COUNT(*) FROM tenants WHERE id = 0);

SET @fc204_new_id := GREATEST(
  (SELECT COALESCE(MAX(id), 0) FROM common_catalogs),
  (SELECT COALESCE(MAX(id), 0) FROM tenants),
  (SELECT COALESCE(MAX(ownerId), 0) FROM fleet_units)
) + 1;

SET @fc204_handle := (SELECT handle FROM tenants WHERE id = 0);

-- b. Copia del catálogo del Universo 0.
INSERT INTO common_catalogs (id, category, parent_id, code, label, numeric_value, unit, is_active, created_at)
SELECT @fc204_new_id, category, parent_id, code, label, numeric_value, unit, is_active, created_at
FROM common_catalogs
WHERE id = 0;

-- c. Copia del tenant 0 con handle temporal (idx_owners_handle es UNIQUE).
INSERT INTO tenants (id, owner_type_id, universe_type_id, mu_user_id, parent_owner_id, label, created_at, handle)
SELECT @fc204_new_id, owner_type_id, universe_type_id, mu_user_id, parent_owner_id, label, created_at,
       CONCAT('FC204-', @fc204_new_id)
FROM tenants
WHERE id = 0;

-- d. Repunteo. FK a tenants.id (16 columnas, todas ON UPDATE RESTRICT).
UPDATE administrative_audit_logs SET owner_id = @fc204_new_id WHERE owner_id = 0 AND @fc204_has_zero > 0;
UPDATE areas SET owner_id = @fc204_new_id WHERE owner_id = 0 AND @fc204_has_zero > 0;
UPDATE cosmonaut_roles SET tenant_id = @fc204_new_id WHERE tenant_id = 0 AND @fc204_has_zero > 0;
UPDATE cosmonaut_role_assignments SET tenant_id = @fc204_new_id WHERE tenant_id = 0 AND @fc204_has_zero > 0;
UPDATE owner_specialties SET owner_id = @fc204_new_id WHERE owner_id = 0 AND @fc204_has_zero > 0;
UPDATE social_posts SET owner_id = @fc204_new_id WHERE owner_id = 0 AND @fc204_has_zero > 0;
UPDATE social_reviews SET taller_owner_id = @fc204_new_id WHERE taller_owner_id = 0 AND @fc204_has_zero > 0;
UPDATE tenants SET parent_owner_id = @fc204_new_id WHERE parent_owner_id = 0 AND @fc204_has_zero > 0;
UPDATE tenant_profiles SET owner_id = @fc204_new_id WHERE owner_id = 0 AND @fc204_has_zero > 0;
UPDATE tenant_service_links SET centro_owner_id = @fc204_new_id WHERE centro_owner_id = 0 AND @fc204_has_zero > 0;
UPDATE tenant_service_links SET privado_owner_id = @fc204_new_id WHERE privado_owner_id = 0 AND @fc204_has_zero > 0;
UPDATE tenant_user_memberships SET owner_id = @fc204_new_id WHERE owner_id = 0 AND @fc204_has_zero > 0;
UPDATE universe_clusters SET tenant_id = @fc204_new_id WHERE tenant_id = 0 AND @fc204_has_zero > 0;
UPDATE universe_superclusters SET tenant_id = @fc204_new_id WHERE tenant_id = 0 AND @fc204_has_zero > 0;
UPDATE universe_lattices SET u1_tenant_id = @fc204_new_id WHERE u1_tenant_id = 0 AND @fc204_has_zero > 0;
UPDATE universe_lattices SET u2_tenant_id = @fc204_new_id WHERE u2_tenant_id = 0 AND @fc204_has_zero > 0;
-- FK a common_catalogs.id con ON DELETE CASCADE: sin este repunteo, el DELETE del 0 la vaciaría.
UPDATE user_fleet_owners SET owner_id = @fc204_new_id WHERE owner_id = 0 AND @fc204_has_zero > 0;
-- Sin FK: dependientes del id del Universo.
UPDATE fleet_units SET ownerId = @fc204_new_id WHERE ownerId = 0 AND @fc204_has_zero > 0;
UPDATE common_catalogs SET parent_id = @fc204_new_id WHERE parent_id = 0 AND @fc204_has_zero > 0;

-- e. Aserción de cero referencias al 0 (antes del DELETE).
SET @fc204_refs := (SELECT COUNT(*) FROM administrative_audit_logs WHERE owner_id = 0)
                 + (SELECT COUNT(*) FROM areas WHERE owner_id = 0)
                 + (SELECT COUNT(*) FROM cosmonaut_roles WHERE tenant_id = 0)
                 + (SELECT COUNT(*) FROM cosmonaut_role_assignments WHERE tenant_id = 0)
                 + (SELECT COUNT(*) FROM owner_specialties WHERE owner_id = 0)
                 + (SELECT COUNT(*) FROM social_posts WHERE owner_id = 0)
                 + (SELECT COUNT(*) FROM social_reviews WHERE taller_owner_id = 0)
                 + (SELECT COUNT(*) FROM tenants WHERE parent_owner_id = 0)
                 + (SELECT COUNT(*) FROM tenant_profiles WHERE owner_id = 0)
                 + (SELECT COUNT(*) FROM tenant_service_links WHERE centro_owner_id = 0 OR privado_owner_id = 0)
                 + (SELECT COUNT(*) FROM tenant_user_memberships WHERE owner_id = 0)
                 + (SELECT COUNT(*) FROM universe_clusters WHERE tenant_id = 0)
                 + (SELECT COUNT(*) FROM universe_superclusters WHERE tenant_id = 0)
                 + (SELECT COUNT(*) FROM universe_lattices WHERE u1_tenant_id = 0 OR u2_tenant_id = 0)
                 + (SELECT COUNT(*) FROM user_fleet_owners WHERE owner_id = 0)
                 + (SELECT COUNT(*) FROM fleet_units WHERE ownerId = 0)
                 + (SELECT COUNT(*) FROM common_catalogs WHERE parent_id = 0)
                 + (SELECT COUNT(*) FROM financial_transactions WHERE category_id = 0 OR source_id = 0)
                 + (SELECT COUNT(*) FROM fleet_maintenance_extensions WHERE service_type_id = 0 OR system_recommended_type_id = 0)
                 + (SELECT COUNT(*) FROM fleet_maintenance_logs WHERE service_type_id = 0)
                 + (SELECT COUNT(*) FROM owner_specialties WHERE catalog_id = 0)
                 + (SELECT COUNT(*) FROM route_incidents WHERE category_id = 0);

SET @fc204_assert := IF(@fc204_refs = 0, 'DO 0', 'SELECT 1 FROM fc204_assertion_failed_references_to_zero_remain');
PREPARE fc204_stmt FROM @fc204_assert;
EXECUTE fc204_stmt;
DEALLOCATE PREPARE fc204_stmt;

-- f. Borrado del 0, ya sin referencias; el universo recupera su handle original.
DELETE FROM tenants WHERE id = 0;
DELETE FROM common_catalogs WHERE id = 0;
UPDATE tenants SET handle = @fc204_handle WHERE id = @fc204_new_id AND @fc204_handle IS NOT NULL;

COMMIT;

-- g. DDL fuera de la TX (commit implícito). Sin fila 0, el ALTER no renumera nada.
ALTER TABLE common_catalogs MODIFY COLUMN id INT(11) NOT NULL AUTO_INCREMENT;

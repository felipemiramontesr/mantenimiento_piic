-- ============================================================
-- Migration 186: núcleo social Arcsial V2 — FC210 F1 (Arcsial_Social_Core_V2_Schema_Migration_186) · 2026-10-10
-- Context: FC210 (O 565_AN · R 566_AN · SC de Ω 2026-10-10; OLR Sí).
--
-- Tablas nuevas: arcsial_actors (registro único de @handle para personas USER y universos UNIVERSE),
-- arcsial_follows (seguimiento unidireccional usuario → actor) y arcsial_posts (muro por actor,
-- desacoplado de social_posts.owner_id). social_posts NO se altera ni se copia: arcsial_posts nace vacía.
-- Llaves foráneas a users(id) / tenants(id) INT(11) con ON DELETE CASCADE.
--
-- Backfill de arcsial_actors, sin INSERT IGNORE y sin renombres (R 556/558/562_AN):
--   USER     ← cada fila de arcsial_profiles (mismo handle, display_name y avatar_url).
--   UNIVERSE ← cada tenant: handle = REPLACE(LOWER(tenants.handle), '-', '_'); display_name = label
--              recortado a 100 (o el handle si el label viene vacío).
-- Aserciones PREVIAS al DDL (si fallan no se crea ninguna tabla): ningún handle de perfil ni de tenant
-- normalizado es uno de los 17 reservados; todo handle de tenant normalizado cumple [a-z0-9_]{3,30}
-- (comparación binaria); ningún universo choca con un perfil ni con otro universo.
-- Aserciones antes del COMMIT: todo perfil tiene su actor USER con el mismo handle y todo tenant
-- tiene su actor UNIVERSE. Si una falla, la consulta revienta, el cliente se detiene y la TX se revierte.
-- TIMESTAMP con NOT NULL explícito: explicit_defaults_for_timestamp difiere entre MariaDB 10.4 (local)
-- y 11.8 (prod); sin él la nulabilidad de updated_at cambiaría la huella de esquema (R-DB-PARITY).
-- Idempotente: CREATE TABLE IF NOT EXISTS y el backfill solo toca perfiles/tenants sin actor.
-- Orden: PRIMERO local (scripts/dbMigrateLocal.ts), DESPUÉS prod (db-migrations.yml, despacho de Ω).
-- ============================================================

SET NAMES utf8mb4;

-- Aserción previa 1: ningún handle existente (perfil o tenant normalizado) es un nombre reservado.
SET @fc210_reserved := (
  SELECT COUNT(*) FROM (
    SELECT handle AS h FROM arcsial_profiles
    UNION ALL
    SELECT REPLACE(LOWER(handle), '-', '_') FROM tenants
  ) x
  WHERE x.h IN ('archon', 'admin', 'administrator', 'root', 'soporte', 'support', 'sistema', 'system',
                'arcsial', 'universe', 'sat', 'hacienda', 'api', 'auth', 'null', 'undefined', 'moderator')
);
SET @fc210_assert := IF(@fc210_reserved = 0, 'DO 0', 'SELECT 1 FROM fc210_assertion_failed_reserved_handle_in_use');
PREPARE fc210_stmt FROM @fc210_assert;
EXECUTE fc210_stmt;
DEALLOCATE PREPARE fc210_stmt;

-- Aserción previa 2: todo handle de tenant normalizado cumple [a-z0-9_]{3,30} en comparación binaria.
SET @fc210_bad := (
  SELECT COUNT(*) FROM tenants
  WHERE NOT (REPLACE(LOWER(handle), '-', '_') COLLATE utf8mb4_bin REGEXP '^[a-z0-9_]{3,30}$')
);
SET @fc210_assert := IF(@fc210_bad = 0, 'DO 0', 'SELECT 1 FROM fc210_assertion_failed_tenant_handle_out_of_pattern');
PREPARE fc210_stmt FROM @fc210_assert;
EXECUTE fc210_stmt;
DEALLOCATE PREPARE fc210_stmt;

-- Aserción previa 3: ningún universo choca con el handle de un perfil.
SET @fc210_clash := (
  SELECT COUNT(*) FROM tenants t
  WHERE EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.handle = REPLACE(LOWER(t.handle), '-', '_'))
);
SET @fc210_assert := IF(@fc210_clash = 0, 'DO 0', 'SELECT 1 FROM fc210_assertion_failed_universe_handle_collides_with_user');
PREPARE fc210_stmt FROM @fc210_assert;
EXECUTE fc210_stmt;
DEALLOCATE PREPARE fc210_stmt;

-- Aserción previa 4: dos universos no normalizan al mismo handle.
SET @fc210_dup := (
  SELECT COUNT(*) - COUNT(DISTINCT REPLACE(LOWER(handle), '-', '_')) FROM tenants
);
SET @fc210_assert := IF(@fc210_dup = 0, 'DO 0', 'SELECT 1 FROM fc210_assertion_failed_universe_handles_collide');
PREPARE fc210_stmt FROM @fc210_assert;
EXECUTE fc210_stmt;
DEALLOCATE PREPARE fc210_stmt;

CREATE TABLE IF NOT EXISTS arcsial_actors (
  id INT(11) NOT NULL AUTO_INCREMENT,
  actor_type ENUM('USER', 'UNIVERSE') NOT NULL,
  user_id INT(11) NULL,
  tenant_id INT(11) NULL,
  handle VARCHAR(32) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT NULL,
  bio TEXT NULL,
  is_searchable TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_arcsial_actor_user (user_id),
  UNIQUE KEY uq_arcsial_actor_tenant (tenant_id),
  UNIQUE KEY uq_arcsial_actor_handle (handle),
  CONSTRAINT fk_arcsial_actor_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_arcsial_actor_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT chk_arcsial_actor_target CHECK (
    (actor_type = 'USER' AND user_id IS NOT NULL AND tenant_id IS NULL)
    OR (actor_type = 'UNIVERSE' AND tenant_id IS NOT NULL AND user_id IS NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arcsial_follows (
  id INT(11) NOT NULL AUTO_INCREMENT,
  follower_user_id INT(11) NOT NULL,
  target_actor_id INT(11) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_arcsial_follows (follower_user_id, target_actor_id),
  CONSTRAINT fk_arcsial_follow_follower FOREIGN KEY (follower_user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_arcsial_follow_target FOREIGN KEY (target_actor_id) REFERENCES arcsial_actors (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arcsial_posts (
  id INT(11) NOT NULL AUTO_INCREMENT,
  author_actor_id INT(11) NOT NULL,
  author_user_id INT(11) NOT NULL,
  content_text TEXT NOT NULL,
  image_urls_json TEXT NULL,
  visibility ENUM('PUBLIC', 'FOLLOWERS', 'CONTACTS') NOT NULL DEFAULT 'PUBLIC',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_arcsial_posts_actor_created (author_actor_id, created_at),
  KEY idx_arcsial_posts_created (created_at),
  CONSTRAINT fk_arcsial_post_actor FOREIGN KEY (author_actor_id) REFERENCES arcsial_actors (id) ON DELETE CASCADE,
  CONSTRAINT fk_arcsial_post_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

-- Actores USER: un actor por perfil, con el mismo handle (los perfiles ya son únicos entre sí).
INSERT INTO arcsial_actors (actor_type, user_id, handle, display_name, avatar_url)
SELECT 'USER', p.user_id, p.handle, p.display_name, p.avatar_url
FROM arcsial_profiles p
WHERE NOT EXISTS (SELECT 1 FROM arcsial_actors a WHERE a.user_id = p.user_id);

-- Actores UNIVERSE: handle del tenant en minúsculas y con guion bajo. Sin sufijos: un choque revienta
-- contra uq_arcsial_actor_handle y la TX se revierte.
INSERT INTO arcsial_actors (actor_type, tenant_id, handle, display_name)
SELECT 'UNIVERSE', t.id, REPLACE(LOWER(t.handle), '-', '_'),
       LEFT(COALESCE(NULLIF(TRIM(t.label), ''), REPLACE(LOWER(t.handle), '-', '_')), 100)
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM arcsial_actors a WHERE a.tenant_id = t.id);

-- Aserción 5: todo perfil tiene su actor USER con el mismo handle.
SET @fc210_missing_user := (
  SELECT COUNT(*) FROM arcsial_profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM arcsial_actors a
    WHERE a.user_id = p.user_id AND a.actor_type = 'USER' AND a.handle = p.handle
  )
);
SET @fc210_assert := IF(@fc210_missing_user = 0, 'DO 0', 'SELECT 1 FROM fc210_assertion_failed_profile_without_actor');
PREPARE fc210_stmt FROM @fc210_assert;
EXECUTE fc210_stmt;
DEALLOCATE PREPARE fc210_stmt;

-- Aserción 6: todo tenant tiene su actor UNIVERSE.
SET @fc210_missing_universe := (
  SELECT COUNT(*) FROM tenants t
  WHERE NOT EXISTS (SELECT 1 FROM arcsial_actors a WHERE a.tenant_id = t.id AND a.actor_type = 'UNIVERSE')
);
SET @fc210_assert := IF(@fc210_missing_universe = 0, 'DO 0', 'SELECT 1 FROM fc210_assertion_failed_tenant_without_actor');
PREPARE fc210_stmt FROM @fc210_assert;
EXECUTE fc210_stmt;
DEALLOCATE PREPARE fc210_stmt;

COMMIT;

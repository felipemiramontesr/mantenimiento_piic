-- ============================================================
-- Migration 185: red social Arcsial — FC209 F1 (Arcsial_Social_Schema_Migration_185) · 2026-10-09
-- Context: FC209 (O 543_AN · R 544_AN · SC de Ω 2026-10-09; OLR Sí). Sustituye la F2 pausada de FC206.
--
-- Tablas nuevas: arcsial_profiles (handle público, cierra el oráculo de correos: el username del
-- autoregistro ES el correo), arcsial_contacts (contacto bilateral, par ordenado low < high),
-- arcsial_invitations (CONTACT | UNIVERSE; token_hash SHA-256, nunca el token; tenant_id solo en
-- UNIVERSE) y arcsial_blocks. Llaves foráneas a users(id) / tenants(id) INT(11) con ON DELETE CASCADE.
--
-- Backfill de arcsial_profiles (R 540/542_AN), sin INSERT IGNORE (no esconde errores):
--   1. LOWER(username) que cumple [a-z0-9_]{3,30} → handle = LOWER(username) si no está tomado.
--   2. El resto → 'arc_' + tramo hex del uuid SIN guiones (REPLACE(uuid,'-','')) de 8; si dos
--      usuarios comparten el tramo o ya está tomado, pasan a 12, luego 16 y luego 26 (≤ 30 en total).
--   display_name = full_name si viene (recortado a 100), si no el handle.
-- Aserciones antes del COMMIT: todo usuario con perfil y todo handle dentro del patrón (comparación
-- binaria). Si fallan, la consulta revienta, el cliente mysql se detiene y la TX se revierte.
-- Idempotente: CREATE TABLE IF NOT EXISTS y el backfill solo toca usuarios sin perfil.
-- Orden: PRIMERO local (scripts/dbMigrateLocal.ts), DESPUÉS prod (db-migrations.yml, despacho de Ω).
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS arcsial_profiles (
  user_id INT(11) NOT NULL,
  handle VARCHAR(32) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_arcsial_profiles_handle (handle),
  CONSTRAINT fk_arcsial_profile_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arcsial_contacts (
  id INT(11) NOT NULL AUTO_INCREMENT,
  user_id_low INT(11) NOT NULL,
  user_id_high INT(11) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_arcsial_contacts (user_id_low, user_id_high),
  KEY idx_arcsial_contacts_high (user_id_high),
  CONSTRAINT fk_arcsial_contact_low FOREIGN KEY (user_id_low) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_arcsial_contact_high FOREIGN KEY (user_id_high) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_arcsial_contacts_order CHECK (user_id_low < user_id_high)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arcsial_invitations (
  id INT(11) NOT NULL AUTO_INCREMENT,
  sender_id INT(11) NOT NULL,
  recipient_id INT(11) NOT NULL,
  invite_type ENUM('CONTACT', 'UNIVERSE') NOT NULL,
  tenant_id INT(11) NULL,
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  token_hash CHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Sin DEFAULT, un segundo TIMESTAMP NOT NULL falla en MariaDB (1067, cero implícito). El backend
  -- siempre la fija (alta + 7 días); si faltara, la invitación nacería ya vencida (fail-closed).
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_arcsial_invite_token_hash (token_hash),
  KEY idx_arcsial_invite_recipient_status (recipient_id, status),
  KEY idx_arcsial_invite_sender_status (sender_id, status),
  KEY idx_arcsial_invite_tenant (tenant_id),
  CONSTRAINT fk_arcsial_invite_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_arcsial_invite_recipient FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_arcsial_invite_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
  CONSTRAINT chk_arcsial_invite_tenant CHECK (
    (invite_type = 'CONTACT' AND tenant_id IS NULL) OR (invite_type = 'UNIVERSE' AND tenant_id IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arcsial_blocks (
  id INT(11) NOT NULL AUTO_INCREMENT,
  blocker_id INT(11) NOT NULL,
  blocked_id INT(11) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_arcsial_blocks (blocker_id, blocked_id),
  KEY idx_arcsial_blocks_blocked (blocked_id),
  CONSTRAINT fk_arcsial_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_arcsial_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

-- Paso 1: el username ya es un handle válido (los usernames son únicos: no chocan entre sí).
INSERT INTO arcsial_profiles (user_id, handle, display_name)
SELECT u.id, LOWER(u.username), LEFT(COALESCE(NULLIF(TRIM(u.full_name), ''), LOWER(u.username)), 100)
FROM users u
WHERE LOWER(u.username) COLLATE utf8mb4_bin REGEXP '^[a-z0-9_]{3,30}$'
  AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.handle = LOWER(u.username));

-- Pasos 2–5: 'arc_' + tramo hex del uuid sin guiones, de 8, 12, 16 y 26. Un tramo compartido por
-- dos usuarios pendientes, o ya tomado, no se inserta: esos usuarios pasan a la longitud siguiente.
SET @fc209_len := 8;
INSERT INTO arcsial_profiles (user_id, handle, display_name)
SELECT c.id, c.handle, LEFT(COALESCE(NULLIF(TRIM(c.full_name), ''), c.handle), 100)
FROM (
  SELECT u.id, u.full_name,
         CONCAT('arc_', LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS handle,
         COUNT(*) OVER (PARTITION BY LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS same_prefix
  FROM users u
  WHERE u.uuid IS NOT NULL -- sin uuid no hay tramo: el usuario cae en la aserción 1
    AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.user_id = u.id)
) c
WHERE c.same_prefix = 1
  AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.handle = c.handle);

SET @fc209_len := 12;
INSERT INTO arcsial_profiles (user_id, handle, display_name)
SELECT c.id, c.handle, LEFT(COALESCE(NULLIF(TRIM(c.full_name), ''), c.handle), 100)
FROM (
  SELECT u.id, u.full_name,
         CONCAT('arc_', LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS handle,
         COUNT(*) OVER (PARTITION BY LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS same_prefix
  FROM users u
  WHERE u.uuid IS NOT NULL -- sin uuid no hay tramo: el usuario cae en la aserción 1
    AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.user_id = u.id)
) c
WHERE c.same_prefix = 1
  AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.handle = c.handle);

SET @fc209_len := 16;
INSERT INTO arcsial_profiles (user_id, handle, display_name)
SELECT c.id, c.handle, LEFT(COALESCE(NULLIF(TRIM(c.full_name), ''), c.handle), 100)
FROM (
  SELECT u.id, u.full_name,
         CONCAT('arc_', LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS handle,
         COUNT(*) OVER (PARTITION BY LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS same_prefix
  FROM users u
  WHERE u.uuid IS NOT NULL -- sin uuid no hay tramo: el usuario cae en la aserción 1
    AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.user_id = u.id)
) c
WHERE c.same_prefix = 1
  AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.handle = c.handle);

SET @fc209_len := 26;
INSERT INTO arcsial_profiles (user_id, handle, display_name)
SELECT c.id, c.handle, LEFT(COALESCE(NULLIF(TRIM(c.full_name), ''), c.handle), 100)
FROM (
  SELECT u.id, u.full_name,
         CONCAT('arc_', LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS handle,
         COUNT(*) OVER (PARTITION BY LEFT(LOWER(REPLACE(u.uuid, '-', '')), @fc209_len)) AS same_prefix
  FROM users u
  WHERE u.uuid IS NOT NULL -- sin uuid no hay tramo: el usuario cae en la aserción 1
    AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.user_id = u.id)
) c
WHERE c.same_prefix = 1
  AND NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.handle = c.handle);

-- Aserción 1: ningún usuario quedó sin perfil (p. ej. uuid nulo o colisión hasta 26 hex).
SET @fc209_missing := (
  SELECT COUNT(*) FROM users u
  WHERE NOT EXISTS (SELECT 1 FROM arcsial_profiles p WHERE p.user_id = u.id)
);
SET @fc209_assert := IF(@fc209_missing = 0, 'DO 0', 'SELECT 1 FROM fc209_assertion_failed_user_without_profile');
PREPARE fc209_stmt FROM @fc209_assert;
EXECUTE fc209_stmt;
DEALLOCATE PREPARE fc209_stmt;

-- Aserción 2: todo handle cumple [a-z0-9_]{3,30} en comparación binaria (sin mayúsculas ni '@').
SET @fc209_bad := (
  SELECT COUNT(*) FROM arcsial_profiles
  WHERE NOT (handle COLLATE utf8mb4_bin REGEXP '^[a-z0-9_]{3,30}$')
);
SET @fc209_assert := IF(@fc209_bad = 0, 'DO 0', 'SELECT 1 FROM fc209_assertion_failed_handle_out_of_pattern');
PREPARE fc209_stmt FROM @fc209_assert;
EXECUTE fc209_stmt;
DEALLOCATE PREPARE fc209_stmt;

COMMIT;

-- Migration: 090 — Add UUID to users table
-- Reason: UUID-based routing for UserNode (/dashboard/users/:uuid)
--         Prevents enumeration of sequential numeric IDs in public URLs.

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS uuid CHAR(36) UNIQUE DEFAULT (UUID());

-- Backfill any rows that lack a uuid (idempotent)
UPDATE users SET uuid = UUID() WHERE uuid IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);

SET FOREIGN_KEY_CHECKS = 1;

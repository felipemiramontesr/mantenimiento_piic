SET NAMES utf8mb4;

-- =============================================================================
-- Migration: 136 — notifications_outbox ADD user_id
-- FC: DB_Hardening_Normalization_2026 · FaseC
-- user_id NULL-able: historical rows and broadcasts remain valid.
-- FK ON DELETE SET NULL: preserves outbox row (audit trail) when user deleted.
-- Required by FC-E2 Panic_Button to scope push notifications per recipient.
-- Split into separate ALTER statements — MariaDB 10.4 does not support
-- ADD CONSTRAINT IF NOT EXISTS combined with ADD COLUMN IF NOT EXISTS.
-- =============================================================================

-- Step 1: Add user_id column (idempotent via IF NOT EXISTS)
ALTER TABLE notifications_outbox
  ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER sent_at;

-- Step 2: Add index (idempotent via IF NOT EXISTS)
ALTER TABLE notifications_outbox
  ADD INDEX IF NOT EXISTS idx_notif_outbox_user_id (user_id);

-- Step 3: Add FK constraint (not idempotent — skip if already exists)
-- Check: SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
--   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notifications_outbox'
--   AND CONSTRAINT_NAME='fk_notif_outbox_user';
ALTER TABLE notifications_outbox
  ADD CONSTRAINT fk_notif_outbox_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ─── Verification ─────────────────────────────────────────────────────────────
-- DESCRIBE notifications_outbox;
-- Expected: user_id INT NULL present after sent_at with KEY idx_notif_outbox_user_id

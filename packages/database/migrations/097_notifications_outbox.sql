-- Migration 097: notifications_outbox
-- Dedup table for slow-state CRON push alerts (Capa 2b).
-- Keyed by (permission_slug, notification_type, source_uuid) — coarse enough to
-- avoid per-user coupling but granular enough to re-alert on new order cycles.

CREATE TABLE IF NOT EXISTS notifications_outbox (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  permission_slug   VARCHAR(100) NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  source_uuid       VARCHAR(36)  NOT NULL,
  sent_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_outbox_dedup (permission_slug, notification_type, source_uuid),
  INDEX idx_outbox_source (source_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

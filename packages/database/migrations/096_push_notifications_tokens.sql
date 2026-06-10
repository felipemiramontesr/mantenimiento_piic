-- =============================================================================
-- Migration: 096 — Push Notification Tokens Schema
-- Context : Stores Firebase Cloud Messaging (FCM) registration tokens per user.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(512) NOT NULL,
  device_type VARCHAR(50) NULL, -- 'web', 'android', 'ios'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_token (user_id, token),
  CONSTRAINT fk_upt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_upt_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET NAMES utf8mb4;

-- ===========================================================================
-- Migration: 145 — social_posts
-- FC-9 SocialNetwork_Multiverso FaseA — Perfil Dinámico + Muro Social
-- content_text sanitized server-side (PII blocked before INSERT).
-- image_urls_json stores JSON array of image URLs (optional).
-- owner_id enforces multi-tenant scope (EAL6+).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS social_posts (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  author_id        INT  NOT NULL,
  owner_id         INT  NOT NULL,
  content_text     TEXT NOT NULL,
  image_urls_json  TEXT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_social_post_author  (author_id),
  INDEX idx_social_post_owner   (owner_id),
  INDEX idx_social_post_created (created_at),

  CONSTRAINT fk_social_post_author FOREIGN KEY (author_id) REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_social_post_owner  FOREIGN KEY (owner_id)  REFERENCES owners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

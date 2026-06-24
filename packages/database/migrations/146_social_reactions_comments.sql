SET NAMES utf8mb4;

-- ===========================================================================
-- Migration: 146 — social_reactions + social_comments
-- FC-9 SocialNetwork_Multiverso FaseB — Muro Social + Reacciones + Hilos
-- social_reactions: UNIQUE(post_id,user_id,type) — one reaction per type per user.
-- social_comments: self-referencing parent_comment_id for nested threads.
-- PII blocked server-side on social_comments.content_text before INSERT.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS social_reactions (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  post_id  INT NOT NULL,
  user_id  INT NOT NULL,
  type     ENUM('IMPECABLE','VELOZ','TRANSPARENTE','UTIL') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_reaction (post_id, user_id, type),
  INDEX idx_reaction_post (post_id),
  INDEX idx_reaction_user (user_id),

  CONSTRAINT fk_reaction_post FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_reaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_comments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  post_id           INT NOT NULL,
  author_id         INT NOT NULL,
  parent_comment_id INT NULL,
  content_text      TEXT NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_comment_post   (post_id),
  INDEX idx_comment_author (author_id),
  INDEX idx_comment_parent (parent_comment_id),

  CONSTRAINT fk_comment_post   FOREIGN KEY (post_id)           REFERENCES social_posts(id)    ON DELETE CASCADE,
  CONSTRAINT fk_comment_author FOREIGN KEY (author_id)         REFERENCES users(id)           ON DELETE CASCADE,
  CONSTRAINT fk_comment_parent FOREIGN KEY (parent_comment_id) REFERENCES social_comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

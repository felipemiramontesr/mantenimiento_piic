SET NAMES utf8mb4;

-- ===========================================================================
-- Migration: 147 — social_reviews (Valoraciones Verificadas)
-- FC-9 SocialNetwork_Multiverso FaseC
-- verified: TINYINT STATIC (not GENERATED). API hidrata verified=1 en INSERT
-- si work_order.status='CLOSED' OR owner_service_links FK válido.
-- UNIQUE(reviewer_id, taller_owner_id) — una reseña por par.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS social_reviews (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  reviewer_id      INT NOT NULL,
  taller_owner_id  INT NOT NULL,
  rating           TINYINT(1) NOT NULL COMMENT 'Rating 1-5',
  body_text        TEXT NOT NULL,
  work_order_id    INT NULL,
  link_id          INT NULL,
  verified         TINYINT(1) NOT NULL DEFAULT 0,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_review (reviewer_id, taller_owner_id),
  INDEX idx_review_taller   (taller_owner_id),
  INDEX idx_review_reviewer (reviewer_id),

  CONSTRAINT fk_review_reviewer    FOREIGN KEY (reviewer_id)     REFERENCES users(id)               ON DELETE CASCADE,
  CONSTRAINT fk_review_taller      FOREIGN KEY (taller_owner_id) REFERENCES owners(id)              ON DELETE CASCADE,
  CONSTRAINT fk_review_work_order  FOREIGN KEY (work_order_id)   REFERENCES upa_work_orders(id)     ON DELETE SET NULL,
  CONSTRAINT fk_review_link        FOREIGN KEY (link_id)         REFERENCES owner_service_links(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

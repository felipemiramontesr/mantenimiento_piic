-- =============================================================================
-- Migration: 094 — RBAC Multi-Role (user_roles + system:manage_roles)
-- Context : Feature Contract "Archon Control Panel (RBAC Matrix)"
--           Introduces multi-role support per user (AG architecture decision).
--           user_roles replaces single users.role_id as the authority.
--           Backfills existing users so the system starts in a known state.
-- =============================================================================

-- 1. CREATE user_roles join table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id     INT NOT NULL,
  role_id     INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  INDEX idx_ur_user (user_id),
  INDEX idx_ur_role (role_id)
);

-- 2. Backfill from users.role_id (idempotent via INSERT IGNORE)
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT id, role_id
FROM users
WHERE role_id IS NOT NULL;

-- 3. Add system:manage_roles permission (guards Panel de Control access)
INSERT IGNORE INTO permissions (slug, description) VALUES
  ('system:manage_roles', 'Gestionar roles y permisos del sistema desde el Panel de Control');

-- 4. Assign system:manage_roles to Master (Archon) role only (id = 0)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 0, id FROM permissions WHERE slug = 'system:manage_roles';

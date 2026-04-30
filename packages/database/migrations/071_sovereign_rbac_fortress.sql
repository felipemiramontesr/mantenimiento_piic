-- =============================================================================
-- Migration: 071 - Sovereign RBAC Fortress (Archon Identity V2)
-- Architecture: Sentinel Security Layer
-- Description: Establishes a hardened Role-Based Access Control system.
-- =============================================================================

-- 1. CLEANUP LEGACY SECURITY DATA
-- We disable foreign key checks temporarily to perform a surgical reconstruction
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM role_permissions;
DELETE FROM roles;
DELETE FROM permissions;

-- 2. SOVEREIGN ROLES DEFINITION
-- Using fixed IDs for critical system stability
INSERT INTO roles (id, name, description) VALUES 
(0, 'Master (Archon)', 'Global system controller. Total bypass of permission checks.'),
(1, 'Director de Flotilla', 'Strategic asset manager. Full access to fleet registry and financial KPIs.'),
(2, 'Supervisor de Mantenimiento', 'Operational lead. Manages schedules, work orders, and technical staff.'),
(3, 'Técnico Especialista', 'Field expert. Executes services, updates readings, and technical logs.'),
(4, 'Operador de Unidad', 'Unit driver/operator. Daily checklists and anomaly reporting.'),
(5, 'Auditor Operativo', 'Compliance officer. Read-only access to all modules and analytical reports.');

-- 3. CORE PERMISSIONS (SLUGS)
-- Standardizing the "Sovereign Command" permission set
INSERT INTO permissions (slug, description) VALUES 
('fleet:view', 'Ability to view assets and units'),
('fleet:write', 'Ability to create/edit units and brands'),
('fleet:delete', 'Ability to decommission units'),
('maint:view', 'Ability to view maintenance logs and schedules'),
('maint:write', 'Ability to create work orders and update services'),
('financial:view', 'Ability to view costs, leases, and financial KPIs'),
('user:admin', 'Ability to manage users and roles'),
('report:export', 'Ability to export data to CSV/Excel');

-- 4. BINDING ROLES TO PERMISSIONS (The Matrix)

-- DIRECTOR DE FLOTILLA (Full Fleet + Financial)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 1, id FROM permissions WHERE slug IN ('fleet:view', 'fleet:write', 'maint:view', 'financial:view', 'report:export');

-- SUPERVISOR DE MANTENIMIENTO (Full Maintenance + Fleet View)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 2, id FROM permissions WHERE slug IN ('fleet:view', 'maint:view', 'maint:write', 'report:export');

-- TÉCNICO ESPECIALISTA (Maint Write + Fleet View)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 3, id FROM permissions WHERE slug IN ('fleet:view', 'maint:view', 'maint:write');

-- OPERADOR DE UNIDAD (Checklists only - mapped to maint:write for simplified reporting)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 4, id FROM permissions WHERE slug IN ('fleet:view', 'maint:write');

-- AUDITOR OPERATIVO (Everything Read-only)
INSERT INTO role_permissions (role_id, permission_id) 
SELECT 5, id FROM permissions WHERE slug IN ('fleet:view', 'maint:view', 'financial:view');

-- Note: Master (Archon) has ID 0 and is bypassed at code-level for maximum performance.

-- 5. RELATIONAL ALIGNMENT
-- Ensure all existing users are reset to a safe role if they become orphaned (e.g. Auditor)
UPDATE users SET role_id = 5 WHERE role_id NOT IN (0,1,2,3,4,5);

-- Enable checks back
SET FOREIGN_KEY_CHECKS = 1;

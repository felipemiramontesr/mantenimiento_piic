-- ============================================================
-- Migration 149: Tenancy Nomenclature Migration — FC-18 FaseB
-- Feature: Archon_Cosmology_And_Tenancy_Restructure
-- Context: Renames ownership/tenancy tables to reflect the Dual Model (§18.2 L).
--          Code hierarchy: Multiverso → Universo → Supercúmulo → Cúmulo
--          Tenancy hierarchy: Plataforma → Tenant → Owner → Collaborator
-- Idempotent: safe to run multiple times (procedure checks before rename)
-- FK note: MySQL propagates all REFERENCES owners(id) constraints to
--          the renamed table automatically — no manual FK updates required.
--          13 child tables affected (areas, user_owner_membership, owner_profiles,
--          owner_service_links, audit_log, crm_contacts, crm_pipeline, crm_contracts,
--          crm_interactions, campaign_templates, social_posts, social_reviews,
--          users/parent_owner_id).
-- Backward compat: Creates OR REPLACES views with old names so existing API code
--          (FaseC migration window) keeps working without modification.
-- GrayMan applies via phpMyAdmin Import. No FOREIGN_KEY_CHECKS toggle needed.
-- ============================================================

SET NAMES utf8mb4;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Rename owners → tenants
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS archon_rename_owners;
DELIMITER $$
CREATE PROCEDURE archon_rename_owners()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'owners' AND TABLE_TYPE = 'BASE TABLE'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND TABLE_TYPE = 'BASE TABLE'
  ) THEN
    RENAME TABLE owners TO tenants;
  END IF;
END$$
DELIMITER ;
CALL archon_rename_owners();
DROP PROCEDURE IF EXISTS archon_rename_owners;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Rename owner_profiles → tenant_profiles
-- (FK fk_owner_profiles_owner → tenants(id) auto-updated by MySQL on STEP 1)
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS archon_rename_owner_profiles;
DELIMITER $$
CREATE PROCEDURE archon_rename_owner_profiles()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'owner_profiles' AND TABLE_TYPE = 'BASE TABLE'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_profiles' AND TABLE_TYPE = 'BASE TABLE'
  ) THEN
    RENAME TABLE owner_profiles TO tenant_profiles;
  END IF;
END$$
DELIMITER ;
CALL archon_rename_owner_profiles();
DROP PROCEDURE IF EXISTS archon_rename_owner_profiles;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Rename user_owner_membership → tenant_user_memberships
-- (FK fk_uom_owner → tenants(id) auto-updated by MySQL on STEP 1)
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS archon_rename_membership;
DELIMITER $$
CREATE PROCEDURE archon_rename_membership()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_owner_membership' AND TABLE_TYPE = 'BASE TABLE'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_user_memberships' AND TABLE_TYPE = 'BASE TABLE'
  ) THEN
    RENAME TABLE user_owner_membership TO tenant_user_memberships;
  END IF;
END$$
DELIMITER ;
CALL archon_rename_membership();
DROP PROCEDURE IF EXISTS archon_rename_membership;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Rename owner_service_links → tenant_service_links
-- (FKs fk_osl_privado + fk_osl_centro → tenants(id) auto-updated on STEP 1)
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS archon_rename_service_links;
DELIMITER $$
CREATE PROCEDURE archon_rename_service_links()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'owner_service_links' AND TABLE_TYPE = 'BASE TABLE'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenant_service_links' AND TABLE_TYPE = 'BASE TABLE'
  ) THEN
    RENAME TABLE owner_service_links TO tenant_service_links;
  END IF;
END$$
DELIMITER ;
CALL archon_rename_service_links();
DROP PROCEDURE IF EXISTS archon_rename_service_links;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Backward-compatibility views (FaseC API migration window)
-- CREATE OR REPLACE VIEW is idempotent — safe to run multiple times.
-- These views allow existing API queries referencing old names to keep working
-- during the FaseC transition window without requiring immediate code changes.
-- IMPORTANT: Views are READ/WRITE compatible (single-table, no aggregation).
-- Remove these views only after FaseC completes all API query migrations.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW owners                AS SELECT * FROM tenants;
CREATE OR REPLACE VIEW owner_profiles        AS SELECT * FROM tenant_profiles;
CREATE OR REPLACE VIEW user_owner_membership AS SELECT * FROM tenant_user_memberships;
CREATE OR REPLACE VIEW owner_service_links   AS SELECT * FROM tenant_service_links;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION (run manually after applying via phpMyAdmin):
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT TABLE_NAME, TABLE_TYPE
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = DATABASE()
--   AND TABLE_NAME IN ('tenants','tenant_profiles','tenant_user_memberships','tenant_service_links',
--                      'owners','owner_profiles','user_owner_membership','owner_service_links')
-- ORDER BY TABLE_TYPE, TABLE_NAME;
--
-- Expected result:
--   BASE TABLE: tenants, tenant_profiles, tenant_user_memberships, tenant_service_links
--   VIEW:       owner_profiles, owner_service_links, owners, user_owner_membership
-- ─────────────────────────────────────────────────────────────────────────────

-- =============================================================================
-- Migration: 072 - Sovereign Catalog Purge
-- Architecture: Archon Data Integrity
-- Description: Removes redundant security data from common_catalogs.
-- =============================================================================

-- 1. PURGE REDUNDANT USER ROLES
-- These now reside in the dedicated 'roles' table for maximum security.
DELETE FROM common_catalogs 
WHERE category = 'USER_ROLE';

-- 2. OPTIONAL: SYSTEM INTEGRITY CHECK
-- Ensuring no catalogs are left without a valid category
DELETE FROM common_catalogs 
WHERE category IS NULL OR category = '';

-- 3. RESET AUTO_INCREMENT (Optional, for aesthetic cleanliness in new inserts)
-- Note: In some environments this might not be possible if there are higher IDs.
-- ALTER TABLE common_catalogs AUTO_INCREMENT = 1;

-- 4. VERIFICATION LOG
-- The system is now lean and focused on operational assets only.

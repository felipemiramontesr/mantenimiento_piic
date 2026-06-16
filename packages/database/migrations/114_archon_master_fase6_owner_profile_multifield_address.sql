-- Migration 114: owner_profiles — RFC nullable + Dirección estructurada
-- Feature: Archon_Master_Fase6_OwnerProfile_MultiCampoAddress
-- Idempotent: safe to run multiple times (IF EXISTS / IF NOT EXISTS guards)
-- Prereq: migration_113 (owner_profiles table exists)

-- 1. Relaxar NOT NULL en rfc: Rol 4 (Privado) no requiere RFC obligatorio
--    Rol 1 y Rol 3 siguen requiriéndolo a nivel aplicación (Zod guard)
ALTER TABLE owner_profiles
  MODIFY COLUMN rfc VARCHAR(20) NULL;

-- 2. Eliminar campo de dirección libre (reemplazado por campos estructurados)
ALTER TABLE owner_profiles
  DROP COLUMN IF EXISTS direccion;

-- 3. Añadir campos de dirección estructurada (MySQL 8.0+ IF NOT EXISTS)
ALTER TABLE owner_profiles
  ADD COLUMN IF NOT EXISTS calle            VARCHAR(200) NULL AFTER especialidades,
  ADD COLUMN IF NOT EXISTS numero_exterior  VARCHAR(20)  NULL AFTER calle,
  ADD COLUMN IF NOT EXISTS numero_interior  VARCHAR(20)  NULL AFTER numero_exterior,
  ADD COLUMN IF NOT EXISTS neighborhood_id  INT(11)      NULL AFTER numero_interior;

-- 4. FK hacia neighborhoods (DROP primero para idempotencia)
ALTER TABLE owner_profiles
  DROP FOREIGN KEY IF EXISTS fk_op_neighborhood;

ALTER TABLE owner_profiles
  ADD CONSTRAINT fk_op_neighborhood
    FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
    ON DELETE SET NULL;

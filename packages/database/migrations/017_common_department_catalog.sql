-- 🔱 ARCHON ORGANIZATIONAL INFRASTRUCTURE --
-- Migration: 017_common_department_catalog.sql
-- Purpose: Centralize organizational taxonomy for Assets and Identity.
-- Standard: Archon Sovereign Identity v1.0

INSERT INTO common_catalogs (category, code, label, is_active) VALUES 
('DEPARTMENT', 'D_ADMIN', 'Administración', '1'),
('DEPARTMENT', 'D_EXPLOR', 'Exploración', '1'),
('DEPARTMENT', 'D_GEOL', 'Geología', '1'),
('DEPARTMENT', 'D_LAB', 'Laboratorio', '1'),
('DEPARTMENT', 'D_MANT_E', 'Mantenimiento Eléctrico', '1'),
('DEPARTMENT', 'D_MANT_P', 'Mantenimiento Planta', '1'),
('DEPARTMENT', 'D_MED_AMB', 'Medio Ambiente', '1'),
('DEPARTMENT', 'D_OPER_M', 'Operación Mina', '1'),
('DEPARTMENT', 'D_OPER_P', 'Operación Planta', '1'),
('DEPARTMENT', 'D_PLAN', 'Planeación', '1'),
('DEPARTMENT', 'D_REL_COM', 'Relaciones Comunitarias', '1'),
('DEPARTMENT', 'D_SEG_PAT', 'Seguridad Patrimonial', '1'),
('DEPARTMENT', 'D_SEG_IND', 'Seguridad Industrial', '1');

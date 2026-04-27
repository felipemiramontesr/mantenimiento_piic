-- 🔱 Archon Alpha v.39.1.9 - "Next-Gen & Global Catalog Expansion"
-- Logic: Consolidating Next-Gen models for Kia, Mitsubishi, Ford and JAC.
-- Purpose: Ensuring the master catalog is future-proof for 2025/2026 fleet acquisitions.

-- 1. KIA (ID 640) - Dominancia en SUVs y Eléctricos
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', 640, 'M_KIA_K3', 'K3 (Sedán / Hatchback)'),
('MODEL', 640, 'M_KIA_K3C', 'K3 Cross'),
('MODEL', 640, 'M_KIA_SELT', 'Seltos'),
('MODEL', 640, 'M_KIA_EV6', 'EV6 (Eléctrico High-Performance)'),
('MODEL', 640, 'M_KIA_NIRO', 'Niro (Híbrido / EV)');

-- 2. MITSUBISHI (ID 631) - Fuerza de Trabajo y Transporte
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', 631, 'M_MIT_L200_25', 'L200 (Nueva Generación 2025)'),
('MODEL', 631, 'M_MIT_XPAND', 'Xpander'),
('MODEL', 631, 'M_MIT_XPAND_C', 'Xpander Cross'),
('MODEL', 631, 'M_MIT_OUT_PHEV', 'Outlander PHEV (Híbrida Enchufable)');

-- 3. FORD (ID 24) - Mastery Expansion
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', 24, 'M_FORD_TERR', 'Territory'),
('MODEL', 24, 'M_FORD_BRON_S', 'Bronco Sport'),
('MODEL', 24, 'M_FORD_BRON_H', 'Bronco (Heritage / Wildtrak)'),
('MODEL', 24, 'M_FORD_EDGE', 'Edge'),
('MODEL', 24, 'M_FORD_ESCA', 'Escape'),
('MODEL', 24, 'M_FORD_MACH_E', 'Mustang Mach-E (Eléctrico)'),
('MODEL', 24, 'M_FORD_CHAS_HD', 'F-Series Chasis Cabina (F-350/450/550)'),
('MODEL', 24, 'M_FORD_E_TRANS', 'E-Transit (Eléctrica)');

-- 4. JAC (ID 256) - Electric Dragon Expansion
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', 256, 'M_JAC_FT9', 'Frison T9 (Insignia)'),
('MODEL', 256, 'M_JAC_SEI4P', 'Sei4 Pro'),
('MODEL', 256, 'M_JAC_SEI6P', 'Sei6 Pro'),
('MODEL', 256, 'M_JAC_E10X', 'E10X (Eléctrico Urbano)'),
('MODEL', 256, 'M_JAC_EJ7', 'E J7 (Eléctrico)'),
('MODEL', 256, 'M_JAC_ESUN', 'E Sunray (Eléctrica de Carga)'),
('MODEL', 256, 'M_JAC_X250', 'X250 (Camión Ligero)'),
('MODEL', 256, 'M_JAC_X450', 'X450 (Camión de Carga)');

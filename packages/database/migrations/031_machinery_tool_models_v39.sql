-- 🔱 Archon Alpha v.39.0.2 - "Industrial Hierarchy Expansion"
-- Logic: Seeding high-performance models for Machinery and Tool catalogs.
-- Architecture: Multi-level Sovereign Dependency.

-- ── 1. BOBCAT MODELS ────────────────────────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_BOBCAT');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'BOB_S650', 'S650 Skid-Steer Loader'), 
('MODEL', @brand_id, 'BOB_E35',  'E35 Compact Excavator'),
('MODEL', @brand_id, 'BOB_T595', 'T595 Compact Track Loader')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 2. JOHN DEERE MODELS ────────────────────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JD');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'JD_310L', '310L Backhoe Loader'), 
('MODEL', @brand_id, 'JD_450K', '450K Crawler Dozer'),
('MODEL', @brand_id, 'JD_85G',  '85G Compact Excavator')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 3. JCB MODELS ───────────────────────────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_JCB');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'JCB_3CX',  '3CX Backhoe Loader'), 
('MODEL', @brand_id, 'JCB_540',  '540-170 Telehandler'),
('MODEL', @brand_id, 'JCB_190',  '190 Skid Steer')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 4. MILWAUKEE MODELS ──────────────────────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_MILWAUKEE');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'MIL_M18_D', 'M18 FUEL Hammer Drill'), 
('MODEL', @brand_id, 'MIL_M18_S', 'M18 FUEL SAWZALL'),
('MODEL', @brand_id, 'MIL_M12_D', 'M12 FUEL Impact Driver')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 5. DEWALT MODELS ────────────────────────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_DEWALT');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'DW_DCD996', 'DCD996 Hammer Drill'), 
('MODEL', @brand_id, 'DW_DWS780', 'DWS780 Miter Saw'),
('MODEL', @brand_id, 'DW_DCF887', 'DCF887 Impact Driver')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

-- ── 6. HILTI MODELS ─────────────────────────────────────────────────────────
SET @brand_id = (SELECT id FROM common_catalogs WHERE code = 'B_HILTI');
INSERT INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', @brand_id, 'HIL_TE70', 'TE 70-ATC/AVR Combihammer'), 
('MODEL', @brand_id, 'HIL_TE3000', 'TE 3000-AVR Jackhammer'),
('MODEL', @brand_id, 'HIL_DX5', 'DX 5 Powder-Actuated Tool')
ON DUPLICATE KEY UPDATE parent_id = VALUES(parent_id), label = VALUES(label);

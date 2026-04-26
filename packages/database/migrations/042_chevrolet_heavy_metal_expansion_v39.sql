-- 🔱 Archon Alpha v.39.1.8 - "Chevrolet Heavy Metal Expansion"
-- Logic: Injecting missing Mexican-market dominant models for Chevrolet (ID 32).
-- Purpose: Granular separation between work units (Silverado) and premium units (Cheyenne), and adding specialized cargo units.

-- 1. ACTUALIZAR SILVERADO 1500 (Quitarle el nombre Cheyenne para separarlas)
UPDATE common_catalogs SET label = 'Silverado 1500 (Work Truck)' WHERE code = 'M_CHV_SIL15';

-- 2. INSERTAR NUEVOS MODELOS DE ALTO IMPACTO
INSERT IGNORE INTO common_catalogs (category, parent_id, code, label) VALUES 
('MODEL', 32, 'M_CHV_CHEY', 'Cheyenne (RST / Trail Boss / ZR2)'),
('MODEL', 32, 'M_CHV_SIL_HD2', 'Silverado 2500 HD'),
('MODEL', 32, 'M_CHV_SIL_HD3', 'Silverado 3500 HD'),
('MODEL', 32, 'M_CHV_SIL_CHAS', 'Silverado 3500 Chasis Cabina'),
('MODEL', 32, 'M_CHV_LCF_3500', 'Low Cab Forward 3500'),
('MODEL', 32, 'M_CHV_LCF_4500', 'Low Cab Forward 4500'),
('MODEL', 32, 'M_CHV_LCF_5500', 'Low Cab Forward 5500'),
('MODEL', 32, 'M_CHV_TRAK', 'Tracker'),
('MODEL', 32, 'M_CHV_TRAX', 'Trax'),
('MODEL', 32, 'M_CHV_GROO', 'Groove'),
('MODEL', 32, 'M_CHV_MONT', 'Montana (Pick-up Compacta)'),
('MODEL', 32, 'M_CHV_EQU', 'Equinox'),
('MODEL', 32, 'M_CHV_TRAV', 'Traverse'),
('MODEL', 32, 'M_CHV_BLAZ', 'Blazer'),
('MODEL', 32, 'M_CHV_CAV', 'Cavalier'),
('MODEL', 32, 'M_CHV_BOLT', 'Bolt EUV (Eléctrico)'),
('MODEL', 32, 'M_CHV_CAM', 'Camaro'),
('MODEL', 32, 'M_CHV_CORV', 'Corvette');

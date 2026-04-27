-- 🔱 Archon Alpha v.39.6.0 - "Sovereign Catalog Zenith"
-- Logic: Migration of hardcoded UI lists to unified database catalogs.

-- 1. VEHICLE COLORS (Migrated from fleetConstants.ts)
INSERT INTO common_catalogs (category, code, label, is_active) VALUES
('VEHICLE_COLOR', 'COL_BLANCO', 'Blanco', 1),
('VEHICLE_COLOR', 'COL_NEGRO', 'Negro', 1),
('VEHICLE_COLOR', 'COL_GRIS', 'Gris', 1),
('VEHICLE_COLOR', 'COL_ROJO', 'Rojo', 1),
('VEHICLE_COLOR', 'COL_AZUL', 'Azul', 1),
('VEHICLE_COLOR', 'COL_VERDE', 'Verde', 1),
('VEHICLE_COLOR', 'COL_AMARILLO', 'Amarillo', 1),
('VEHICLE_COLOR', 'COL_NARANJA', 'Naranja', 1),
('VEHICLE_COLOR', 'COL_CAFE', 'Café', 1),
('VEHICLE_COLOR', 'COL_BEIGE', 'Beige', 1),
('VEHICLE_COLOR', 'COL_PLATEADO', 'Plateado', 1),
('VEHICLE_COLOR', 'COL_DORADO', 'Dorado', 1);

-- 2. MAINTENANCE CENTERS (Migrated from inline UI arrays)
INSERT INTO common_catalogs (category, code, label, is_active) VALUES
('MAINTENANCE_CENTER', 'MC_PIIC', 'PIIC', 1),
('MAINTENANCE_CENTER', 'MC_ARCHON_CORE', 'Archon Core', 1),
('MAINTENANCE_CENTER', 'MC_EXTERNO', 'Taller Externo Autorizado', 1);

-- 3. ROUTE ORIGINS (Migrated from hardcoded RouteAssignmentForm)
INSERT INTO common_catalogs (category, code, label, is_active) VALUES
('ROUTE_ORIGIN', 'ORG_ARIAN_ZAC', 'Arian Silver Zacatecas', 1),
('ROUTE_ORIGIN', 'ORG_PLANTA_ZAC', 'Planta Beneficio Zacatecas', 1),
('ROUTE_ORIGIN', 'ORG_MINA_ZAC', 'Mina San José', 1);

-- 4. INSURANCE COMPANIES (New standard catalog)
INSERT INTO common_catalogs (category, code, label, is_active) VALUES
('INSURANCE_COMPANY', 'INS_AXA', 'AXA Seguros', 1),
('INSURANCE_COMPANY', 'INS_QUALITAS', 'Qualitas', 1),
('INSURANCE_COMPANY', 'INS_GNP', 'GNP Seguros', 1),
('INSURANCE_COMPANY', 'INS_CHUBB', 'Chubb', 1),
('INSURANCE_COMPANY', 'INS_BANORTE', 'Seguros Banorte', 1);

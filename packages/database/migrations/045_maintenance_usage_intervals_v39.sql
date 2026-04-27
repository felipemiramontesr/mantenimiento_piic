-- 🔱 Archon Alpha v.39.2.5 - "Tactical Maintenance Intervals"
-- Logic: Injecting standardized maintenance usage intervals (KM for Vehicles, HRS for Machinery/Tools).
-- Purpose: Professional-grade preventative maintenance planning.

-- ── 1. INTERVALOS DE KILOMETRAJE (VEHÍCULOS) ───────────────────────────
-- Rango: 5,000 KM a 100,000 KM en incrementos de 5,000.
INSERT IGNORE INTO common_catalogs (category, code, label, numeric_value, unit) VALUES 
('FREQ_USAGE', 'U_KM_5K', '5,000 KM', 5000.00, 'km'),
('FREQ_USAGE', 'U_KM_10K', '10,000 KM', 10000.00, 'km'),
('FREQ_USAGE', 'U_KM_15K', '15,000 KM', 15000.00, 'km'),
('FREQ_USAGE', 'U_KM_20K', '20,000 KM', 20000.00, 'km'),
('FREQ_USAGE', 'U_KM_25K', '25,000 KM', 25000.00, 'km'),
('FREQ_USAGE', 'U_KM_30K', '30,000 KM', 30000.00, 'km'),
('FREQ_USAGE', 'U_KM_35K', '35,000 KM', 35000.00, 'km'),
('FREQ_USAGE', 'U_KM_40K', '40,000 KM', 40000.00, 'km'),
('FREQ_USAGE', 'U_KM_45K', '45,000 KM', 45000.00, 'km'),
('FREQ_USAGE', 'U_KM_50K', '50,000 KM', 50000.00, 'km'),
('FREQ_USAGE', 'U_KM_55K', '55,000 KM', 55000.00, 'km'),
('FREQ_USAGE', 'U_KM_60K', '60,000 KM', 60000.00, 'km'),
('FREQ_USAGE', 'U_KM_65K', '65,000 KM', 65000.00, 'km'),
('FREQ_USAGE', 'U_KM_70K', '70,000 KM', 70000.00, 'km'),
('FREQ_USAGE', 'U_KM_75K', '75,000 KM', 75000.00, 'km'),
('FREQ_USAGE', 'U_KM_80K', '80,000 KM', 80000.00, 'km'),
('FREQ_USAGE', 'U_KM_85K', '85,000 KM', 85000.00, 'km'),
('FREQ_USAGE', 'U_KM_90K', '90,000 KM', 90000.00, 'km'),
('FREQ_USAGE', 'U_KM_95K', '95,000 KM', 95000.00, 'km'),
('FREQ_USAGE', 'U_KM_100K', '100,000 KM', 100000.00, 'km');

-- ── 2. INTERVALOS DE HORAS (MAQUINARIA Y HERRAMIENTA) ────────────────────
-- Rango: 50 HRS a 1,000 HRS en incrementos de 50.
INSERT IGNORE INTO common_catalogs (category, code, label, numeric_value, unit) VALUES 
('FREQ_USAGE', 'U_HRS_50', '50 HRS', 50.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_100', '100 HRS', 100.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_150', '150 HRS', 150.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_200', '200 HRS', 200.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_250', '250 HRS', 250.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_300', '300 HRS', 300.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_350', '350 HRS', 350.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_400', '400 HRS', 400.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_450', '450 HRS', 450.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_500', '500 HRS', 500.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_550', '550 HRS', 550.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_600', '600 HRS', 600.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_650', '650 HRS', 650.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_700', '700 HRS', 700.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_750', '750 HRS', 750.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_800', '800 HRS', 800.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_850', '850 HRS', 850.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_900', '900 HRS', 900.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_950', '950 HRS', 950.00, 'hrs'),
('FREQ_USAGE', 'U_HRS_1000', '1,000 HRS', 1000.00, 'hrs');

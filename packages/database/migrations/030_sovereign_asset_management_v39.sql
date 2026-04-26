-- 🔱 Archon Alpha v.39.0.0 - "Sovereign Asset Management Upgrade"
-- Evolution of fleet management to include financial and legal compliance metrics.
-- Integration with Universal Master Catalog System.

-- 1. Insert Categories into common_catalogs
INSERT INTO common_catalogs (category, code, label) VALUES 
('FLEET_OWNER', 'OWN_AS', 'Arian Silver de México'), 
('FLEET_OWNER', 'OWN_HU', 'Huur'),
('COMPLIANCE_STATUS', 'CS_OK', 'Completo / Operativo'), 
('COMPLIANCE_STATUS', 'CS_WARN', 'Incompleto / Observación'), 
('COMPLIANCE_STATUS', 'CS_ERR', 'No Disponible / Crítico')
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- 2. Expand Units Table with Sovereign Metrics
-- We use INTEGER to link to common_catalogs.id
ALTER TABLE fleet_units 
ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES common_catalogs(id),
ADD COLUMN IF NOT EXISTS compliance_status_id INTEGER REFERENCES common_catalogs(id),
ADD COLUMN IF NOT EXISTS accounting_account VARCHAR(50),
ADD COLUMN IF NOT EXISTS legal_compliance_date DATE,
ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE,
ADD COLUMN IF NOT EXISTS monthly_lease_payment DECIMAL(12, 2) DEFAULT 0;

-- 3. Comments for Documentation
COMMENT ON COLUMN fleet_units.owner_id IS 'Link to common_catalogs (category=FLEET_OWNER)';
COMMENT ON COLUMN fleet_units.compliance_status_id IS 'Link to common_catalogs (category=COMPLIANCE_STATUS)';
COMMENT ON COLUMN fleet_units.accounting_account IS 'Accounting mapping for cost center integration';
COMMENT ON COLUMN fleet_units.legal_compliance_date IS 'Expiration of plates/circulation card';
COMMENT ON COLUMN fleet_units.insurance_expiry_date IS 'Expiration of insurance policy';
COMMENT ON COLUMN fleet_units.monthly_lease_payment IS 'Monthly cost of lease or finance';

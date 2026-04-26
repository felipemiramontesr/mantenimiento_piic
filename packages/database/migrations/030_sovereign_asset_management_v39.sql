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

-- 3. Comments for Documentation (MariaDB/MySQL Syntax)
ALTER TABLE fleet_units 
MODIFY owner_id INTEGER COMMENT 'Link to common_catalogs (category=FLEET_OWNER)',
MODIFY compliance_status_id INTEGER COMMENT 'Link to common_catalogs (category=COMPLIANCE_STATUS)',
MODIFY accounting_account VARCHAR(50) COMMENT 'Accounting mapping for cost center integration',
MODIFY legal_compliance_date DATE COMMENT 'Expiration of plates/circulation card',
MODIFY insurance_expiry_date DATE COMMENT 'Expiration of insurance policy',
MODIFY monthly_lease_payment DECIMAL(12, 2) COMMENT 'Monthly cost of lease or finance';

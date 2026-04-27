-- 🔱 Archon Alpha v.39.4.0 - "Sovereign Compliance Layer"
-- Logic: Expanding fleet_units to store critical legal and insurance metadata.
-- Purpose: Enabling active monitoring of insurance policies and government verifications.

ALTER TABLE fleet_units 
ADD COLUMN insurance_policy_number VARCHAR(100) DEFAULT NULL AFTER insurance_expiry_date,
ADD COLUMN insurance_company VARCHAR(100) DEFAULT NULL AFTER insurance_policy_number,
ADD COLUMN last_environmental_verification DATE DEFAULT NULL AFTER legal_compliance_date,
ADD COLUMN last_mechanical_verification DATE DEFAULT NULL AFTER last_environmental_verification,
ADD COLUMN circulation_card_number VARCHAR(100) DEFAULT NULL AFTER tarjeta_circulacion;

-- Nota: Estos campos alimentarán los semáforos del Dashboard en la siguiente versión.

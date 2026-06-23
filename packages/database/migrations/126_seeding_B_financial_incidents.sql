-- ============================================================
-- SEEDING B — financial_transactions + route_incidents
-- FC: DataResilience_NHTSAIntegration · FaseB
-- DB: u701509674_Mant_piic (prod)
-- Idempotente: DELETE WHERE notes='SEED_B' antes de insertar.
-- ============================================================

-- ─── Cleanup (idempotente) ────────────────────────────────────
DELETE FROM route_incidents WHERE description LIKE '[SEED_B]%';
DELETE FROM financial_transactions WHERE notes = 'SEED_B';

-- ─── Variable: primer user válido para created_by ─────────────
SET @cb = (SELECT id FROM users ORDER BY id ASC LIMIT 1);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-101 · TCO 116,000 → REPLACE
-- EC-3: julio 2025 incidents en índices 4-8 (días 30,36,42,48,54)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-101','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2026-03','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2026-04','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','LEASE',4500.00,'2026-05','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-101','INSURANCE',18000.00,'2025-07','MANUAL','Qualitas','SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2026-01','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2026-02','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2026-03','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2026-04','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','FUEL',2000.00,'2026-05','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-101','MAINTENANCE',3500.00,'2025-09','MANUAL','Taller NP300','SEED_B',@cb),
(UUID(),'PIIC-101','MAINTENANCE',3500.00,'2026-01','MANUAL','Taller NP300','SEED_B',@cb),
(UUID(),'PIIC-101','TIRE',8000.00,'2025-10','MANUAL','Llantas Vianney','SEED_B',@cb),
(UUID(),'PIIC-101','REPAIR',5000.00,'2026-03','MANUAL','Taller NP300','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-201 · TCO 202,000 → REPLACE
-- EC-2: $95,000 motor completo (2025-11)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-201','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2026-03','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2026-04','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','LEASE',4500.00,'2026-05','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-201','INSURANCE',18000.00,'2025-07','MANUAL','Qualitas','SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2026-03','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2026-04','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','FUEL',2000.00,'2026-05','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-201','MAINTENANCE',3500.00,'2025-09','MANUAL','Taller NP300','SEED_B',@cb),
(UUID(),'PIIC-201','MAINTENANCE',3500.00,'2025-12','MANUAL','Taller NP300','SEED_B',@cb),
(UUID(),'PIIC-201','REPAIR',95000.00,'2025-11','MANUAL','Motor Mexico SA','SEED_B',@cb),
(UUID(),'PIIC-201','TIRE',8000.00,'2025-10','MANUAL','Llantas Vianney','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-202 · TCO 120,900 → REPLACE
-- EC-2: ZERO incidents — quality_factor = 1.0
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-202','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2026-03','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2026-04','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','LEASE',4500.00,'2026-05','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-202','INSURANCE',22000.00,'2025-07','MANUAL','Qualitas Premium','SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2026-01','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2026-02','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2026-03','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2026-04','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','FUEL',2200.00,'2026-05','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-202','MAINTENANCE',3500.00,'2025-09','MANUAL','Taller Silverado','SEED_B',@cb),
(UUID(),'PIIC-202','MAINTENANCE',3500.00,'2026-01','MANUAL','Taller Silverado','SEED_B',@cb),
(UUID(),'PIIC-202','MAINTENANCE',3500.00,'2026-04','MANUAL','Taller Silverado','SEED_B',@cb),
(UUID(),'PIIC-202','TIRE',8000.00,'2025-10','MANUAL','Llantas Vianney','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-301 · TCO 67,000 → EVALUATE (score 0.744)
-- EC-2: ALL-INCIDENTS → quality_factor = 0.00
-- EC-3: EVALUATE boundary
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-301','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-301','INSURANCE',8000.00,'2025-07','MANUAL','Mapfre','SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2026-01','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','FUEL',1500.00,'2026-02','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-301','MAINTENANCE',5000.00,'2025-11','MANUAL','Taller NP300','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-302 · TCO 205,000 → REPLACE (EC-2 TCO máximo)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-302','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2026-03','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2026-04','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','LEASE',4500.00,'2026-05','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-302','INSURANCE',20000.00,'2025-07','MANUAL','Qualitas','SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2026-01','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2026-02','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2026-03','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2026-04','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','FUEL',3000.00,'2026-05','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-302','MAINTENANCE',15000.00,'2025-09','MANUAL','Taller Comercial','SEED_B',@cb),
(UUID(),'PIIC-302','MAINTENANCE',15000.00,'2026-02','MANUAL','Taller Comercial','SEED_B',@cb),
(UUID(),'PIIC-302','REPAIR',45000.00,'2026-02','MANUAL','Taller Comercial','SEED_B',@cb),
(UUID(),'PIIC-302','TIRE',20000.00,'2025-11','MANUAL','Llantas Vianney','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-303 · TCO 117,000 → REPLACE (score 1.30)
-- EC-2: 3 garantías $0.00 · EC-3: REPLACE
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-303','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2026-03','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2026-04','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','LEASE',4500.00,'2026-05','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-303','INSURANCE',20000.00,'2025-07','MANUAL','Qualitas','SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2026-01','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2026-02','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2026-03','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2026-04','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','FUEL',2000.00,'2026-05','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-303','MAINTENANCE',4000.00,'2025-09','MANUAL','Taller NP300','SEED_B',@cb),
(UUID(),'PIIC-303','MAINTENANCE',4000.00,'2026-01','MANUAL','Taller NP300','SEED_B',@cb),
(UUID(),'PIIC-303','REPAIR',0.00,'2025-08','MANUAL','Distribuidor Nissan','SEED_B',@cb),
(UUID(),'PIIC-303','REPAIR',0.00,'2025-10','MANUAL','Distribuidor Nissan','SEED_B',@cb),
(UUID(),'PIIC-303','REPAIR',0.00,'2026-02','MANUAL','Distribuidor Nissan','SEED_B',@cb),
(UUID(),'PIIC-303','REPAIR',3000.00,'2026-04','MANUAL','Taller NP300','SEED_B',@cb),
(UUID(),'PIIC-303','TIRE',8000.00,'2025-11','MANUAL','Llantas Vianney','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-304 · TCO 83,000 → EVALUATE (VIM FaseF)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-304','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2026-03','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2026-04','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','LEASE',4500.00,'2026-05','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2026-01','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2026-02','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2026-03','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2026-04','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','FUEL',2000.00,'2026-05','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-304','MAINTENANCE',5000.00,'2025-09','MANUAL','Taller NP300','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- PIIC-305 · TCO 83,000 → EVALUATE (VIM FaseF)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO financial_transactions (uuid,unit_id,category,amount,period,source,vendor,notes,created_by) VALUES
(UUID(),'PIIC-305','LEASE',4500.00,'2025-06','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2025-07','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2025-08','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2025-09','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2025-10','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2025-11','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2025-12','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2026-01','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2026-02','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2026-03','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2026-04','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','LEASE',4500.00,'2026-05','MANUAL','Arrendadora Sigma SA de CV','SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2025-06','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2025-07','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2025-08','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2025-09','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2025-10','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2025-11','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2025-12','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2026-01','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2026-02','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2026-03','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2026-04','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','FUEL',2000.00,'2026-05','MANUAL',NULL,'SEED_B',@cb),
(UUID(),'PIIC-305','MAINTENANCE',5000.00,'2025-09','MANUAL','Taller NP300','SEED_B',@cb);

-- ═══════════════════════════════════════════════════════════════
-- route_incidents — PIIC-101 EC-3: julio 2025 (índices 4-8)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO route_incidents (route_uuid, category, description, severity, status)
SELECT uuid, 'OPERATIVA',
  '[SEED_B] Incident blackout julio 2025 - operacion irregular detectada',
  'HIGH', 'OPEN'
FROM (
  SELECT uuid, ROW_NUMBER() OVER (ORDER BY start_at ASC) - 1 AS rn
  FROM fleet_movements
  WHERE unit_id = 'PIIC-101' AND description = 'SEED_A'
) ranked
WHERE rn IN (4, 5, 6, 7, 8);

-- ═══════════════════════════════════════════════════════════════
-- route_incidents — PIIC-301 EC-2: ALL 48 routes (quality_factor = 0.00)
-- severity rotates CRITICAL/HIGH/MEDIUM/LOW por índice
-- ═══════════════════════════════════════════════════════════════
INSERT INTO route_incidents (route_uuid, category, description, severity, status)
SELECT
  uuid,
  'OPERATIVA',
  '[SEED_B] All-incidents EC-2 PIIC-301 - quality degradation pattern',
  CASE
    WHEN (rn % 4) = 0 THEN 'CRITICAL'
    WHEN (rn % 3) = 0 THEN 'HIGH'
    WHEN (rn % 2) = 0 THEN 'MEDIUM'
    ELSE 'LOW'
  END,
  'OPEN'
FROM (
  SELECT uuid, ROW_NUMBER() OVER (ORDER BY start_at ASC) - 1 AS rn
  FROM fleet_movements
  WHERE unit_id = 'PIIC-301' AND description = 'SEED_A'
) ranked
WHERE rn BETWEEN 0 AND 47;

-- ─── Verificación ─────────────────────────────────────────────
SELECT
  unit_id,
  COUNT(*)                                                AS total_tx,
  ROUND(SUM(amount), 2)                                   AS tco_total,
  ROUND(SUM(amount) / 90000.0, 4)                        AS replacement_score,
  CASE
    WHEN SUM(amount) >= 90000 THEN 'REPLACE'
    WHEN SUM(amount) >= 45000 THEN 'EVALUATE'
    ELSE 'KEEP'
  END                                                     AS recommendation
FROM financial_transactions
WHERE notes = 'SEED_B'
GROUP BY unit_id
ORDER BY unit_id;

SELECT
  fm.unit_id,
  COUNT(ri.uuid)                                          AS total_incidents,
  ROUND(1 - COUNT(DISTINCT ri.route_uuid) / COUNT(fm.id), 4) AS quality_factor
FROM fleet_movements fm
LEFT JOIN route_incidents ri
  ON ri.route_uuid COLLATE utf8mb4_unicode_ci = fm.uuid
  AND ri.description LIKE '[SEED_B]%'
WHERE fm.description = 'SEED_A'
GROUP BY fm.unit_id
ORDER BY fm.unit_id;

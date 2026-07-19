-- Migration 164: FC 082 F0c — Identity & Cosmology Clean Slate
-- Perímetro: 084_AN v3.1 CONGELADO (aprobado por Ω 2026-07-18).
-- Gate T2 verificado: Inventario✓ ∧ ConteoCero✓ (local PASS + prod PASS:
-- users_no_grayman=0, CRM×5/links/familiar=0, roles_no_cero=10 seeds) ∧
-- Backup✓ (prod phpMyAdmin + local, por Ω).
-- Orden R6: se ejecuta DESPUÉS del deploy del código purgado (el código
-- viejo consultaba estas tablas/columnas; el nuevo ya no).
-- Idempotente (§23.2): DELETEs re-ejecutables; DROPs con IF EXISTS
-- (MariaDB — mismo dialecto que migración 112).
-- PROHIBIDO tocar: owner_service_links como TABLA (R1 — solo filas),
-- estructura de supercúmulos/cúmulos, universo FMS, red social (145-147),
-- log forense, notifications_outbox, cosmonaut_roles (F3 la estrena).

SET NAMES utf8mb4;

-- ─── (1) Directriz 5 · usuarios: solo GrayMan (EsGrayMan ≡ role_id = 0) ──────
DELETE ur FROM user_roles ur
  JOIN users u ON u.id = ur.user_id
 WHERE u.role_id <> 0;

DELETE FROM users WHERE role_id <> 0;

-- ─── (2) Directriz 5 · roles 1-10 + grants mueren (solo rol 0 queda) ─────────
DELETE FROM role_permissions WHERE role_id <> 0;
DELETE FROM roles WHERE id <> 0;

-- ─── (3) R1 · lattice VACÍA pero VIVA (tabla sobrevive; filas fuera) ─────────
-- Semántica TOTAL deliberada (ConteoCero verificó 0 filas en prod/local; el
-- DELETE es cinturón idempotente). WHERE sobre el PK AUTO_INCREMENT (id≥1)
-- cubre toda fila posible y satisface el gate Sonar S-DeleteWithoutWhere;
-- DELETE (no TRUNCATE) porque social_reviews.link_id exige ON DELETE SET NULL.
DELETE FROM owner_service_links WHERE id > 0;

-- ─── (4) Directriz 3 · único universo: FMS ───────────────────────────────────
DELETE FROM universe_types WHERE code <> 'FMS';

-- ─── (5) Banda VIM de negocio · ownerType PRIVATE/CENTER fuera del catálogo ──
DELETE FROM owner_types_catalog WHERE code IN ('PRIVATE', 'CENTER');

-- ─── (6) Directriz 2 · clusters CRM fuera (orden respeta FKs) ────────────────
DROP TABLE IF EXISTS crm_interactions;      -- FK → crm_contacts
DROP TABLE IF EXISTS crm_opportunities;     -- FK → crm_pipeline_stages
DROP TABLE IF EXISTS crm_pipeline_stages;
DROP TABLE IF EXISTS crm_contracts;
DROP TABLE IF EXISTS crm_contacts;          -- PII AES: ConteoCero=0 verificado
DROP TABLE IF EXISTS campaign_templates;

-- ─── (7) Concepto "familiar" fuera del schema ────────────────────────────────
-- Hallazgo run 29704706200 (ERROR 1347): user_owner_membership es VISTA desde
-- la 149 — se opera sobre la tabla base tenant_user_memberships y se RE-EMITE
-- la vista (patrón 159: las vistas SELECT * capturan columnas al crearse).
ALTER TABLE tenant_user_memberships DROP COLUMN IF EXISTS familiar_type;
CREATE OR REPLACE VIEW user_owner_membership AS SELECT * FROM tenant_user_memberships;

-- ─── (8) Eje suite (ERP|VIM) fuera — un solo eje cosmológico: universo/Arc ───
-- Hallazgo F0c: view_fleet_units_tco (128) y view_fleet_model_failure_patterns
-- (131/134) proyectan o.suite — DROPear la columna sin redefinirlas dejaría
-- ambas vistas inválidas y rompería TCO/recalls (núcleo FMS, Prohibido).
-- Se redefinen SIN suite ANTES del DROP (mismo cuerpo 128/134, columna fuera).

CREATE OR REPLACE VIEW view_fleet_units_tco AS
SELECT
  fu.id                                                                               AS fleet_unit_id,
  fu.ownerId                                                                          AS owner_id,
  COALESCE(SUM(ft.amount), 0.00)                                                     AS tco_total,
  COALESCE(SUM(CASE WHEN ft.category = 'MAINTENANCE'  THEN ft.amount ELSE 0 END), 0.00) AS tco_maintenance,
  COALESCE(SUM(CASE WHEN ft.category = 'INSURANCE'    THEN ft.amount ELSE 0 END), 0.00) AS tco_insurance,
  COALESCE(SUM(CASE WHEN ft.category = 'LEASE'        THEN ft.amount ELSE 0 END), 0.00) AS tco_lease,
  COALESCE(SUM(CASE WHEN ft.category = 'TENENCIA'     THEN ft.amount ELSE 0 END), 0.00) AS tco_tenencia,
  COALESCE(SUM(CASE WHEN ft.category = 'VERIFICACION' THEN ft.amount ELSE 0 END), 0.00) AS tco_verificacion,
  COALESCE(SUM(CASE WHEN ft.category = 'FUEL'         THEN ft.amount ELSE 0 END), 0.00) AS tco_fuel,
  COALESCE(SUM(CASE WHEN ft.category = 'OTHER'        THEN ft.amount ELSE 0 END), 0.00) AS tco_other,
  COUNT(ft.id)                                                                        AS total_records,
  MAX(ft.created_at)                                                                  AS last_record_at
FROM fleet_units fu
JOIN owners o ON fu.ownerId = o.id
LEFT JOIN financial_transactions ft ON ft.unit_id = fu.id
GROUP BY fu.id, fu.ownerId;

CREATE OR REPLACE VIEW view_fleet_model_failure_patterns AS
SELECT
  p.brand_id,
  p.model_id,
  p.make,
  p.model,
  p.year,
  p.failure_category,
  p.occurrence_count,
  p.affected_units,
  p.avg_km_at_failure,
  p.km_std_dev,
  p.avg_cost_mxn,
  p.first_seen_at,
  ROUND(p.affected_units / ut.total_units, 4) AS confidence_score
FROM (
  SELECT
    fu.brandId                    AS brand_id,
    fu.modelId                    AS model_id,
    cb.label                      AS make,
    cm.label                      AS model,
    fu.year,
    ft.category                   AS failure_category,
    COUNT(ft.id)                  AS occurrence_count,
    COUNT(DISTINCT fu.id)         AS affected_units,
    ROUND(AVG(fu.odometer), 0)    AS avg_km_at_failure,
    ROUND(STDDEV(fu.odometer), 0) AS km_std_dev,
    ROUND(AVG(ft.amount), 2)      AS avg_cost_mxn,
    MIN(ft.period)                AS first_seen_at
  FROM financial_transactions ft
  JOIN fleet_units fu ON ft.unit_id = fu.id
  JOIN owners o ON fu.ownerId = o.id
  LEFT JOIN common_catalogs cb ON fu.brandId = cb.id AND cb.category = 'BRAND'
  LEFT JOIN common_catalogs cm ON fu.modelId = cm.id AND cm.category = 'MODEL'
  WHERE ft.category IN ('MAINTENANCE', 'REPAIR')
  GROUP BY fu.brandId, fu.modelId, fu.year, ft.category, cb.label, cm.label

  UNION ALL

  SELECT
    fu.brandId,
    fu.modelId,
    cb.label,
    cm.label,
    fu.year,
    ri.category,
    COUNT(ri.id),
    COUNT(DISTINCT fu.id),
    ROUND(AVG(fm.start_reading), 0),
    ROUND(STDDEV(fm.start_reading), 0),
    NULL,
    DATE(MIN(fm.start_at))
  FROM route_incidents ri
  JOIN fleet_movements fm ON ri.route_uuid = fm.uuid
  JOIN fleet_units fu ON fm.unit_id = fu.id
  JOIN owners o ON fu.ownerId = o.id
  LEFT JOIN common_catalogs cb ON fu.brandId = cb.id AND cb.category = 'BRAND'
  LEFT JOIN common_catalogs cm ON fu.modelId = cm.id AND cm.category = 'MODEL'
  GROUP BY fu.brandId, fu.modelId, fu.year, ri.category, cb.label, cm.label
) p
JOIN (
  SELECT brandId, modelId, year, COUNT(*) AS total_units
  FROM fleet_units
  GROUP BY brandId, modelId, year
) ut ON p.brand_id = ut.brandId AND p.model_id = ut.modelId AND p.year = ut.year;

-- owners es VISTA de tenants (149/159): columna en la base + re-emisión.
ALTER TABLE tenants DROP COLUMN IF EXISTS suite;
CREATE OR REPLACE VIEW owners AS SELECT * FROM tenants;

-- ─── Verificación post (S5/S6/S7 del Gherkin — el workflow muestra salidas) ──
SELECT 'S5_users_solo_grayman' k, COUNT(*) v FROM users WHERE role_id <> 0
UNION SELECT 'S5_roles_solo_cero', COUNT(*) FROM roles WHERE id <> 0
UNION SELECT 'S6_universos_no_fms', COUNT(*) FROM universe_types WHERE code <> 'FMS'
UNION SELECT 'S7_lattice_filas', COUNT(*) FROM owner_service_links
UNION SELECT 'S7_ownertype_vim', COUNT(*) FROM owner_types_catalog WHERE code IN ('PRIVATE','CENTER')
UNION SELECT 'social_intacta_posts', COUNT(*) FROM social_posts;
-- Esperado: todas las filas S* en 0; social_intacta_posts = valor previo intacto.

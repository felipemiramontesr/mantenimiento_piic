-- ============================================================
-- ARCHON STRESS TEST PROD — FC DataResilience FaseA
-- DB: u701509674_Mant_piic
-- Ejecutar query por query en phpMyAdmin para ver tiempos.
-- Requiere MySQL 8.0+ (CTEs/window functions).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Q1: Eficiencia global km/L por unidad + gasto total
-- Valida: fleet_movements × fleet_units JOIN completo
-- ─────────────────────────────────────────────────────────────
SELECT
  fm.unit_id,
  COUNT(fm.id)                                                         AS total_rutas,
  ROUND(SUM(fm.end_reading - fm.start_reading), 0)                    AS km_total,
  ROUND(SUM(fm.fuel_liters_loaded), 2)                                AS litros_total,
  ROUND(
    SUM(fm.end_reading - fm.start_reading) /
    NULLIF(SUM(fm.fuel_liters_loaded), 0), 4)                         AS km_l,
  ROUND(SUM(fm.fuel_amount), 2)                                       AS gasto_mxn,
  MIN(DATE(fm.start_at))                                              AS primera_ruta,
  MAX(DATE(fm.start_at))                                              AS ultima_ruta
FROM fleet_movements fm
WHERE fm.description = 'SEED_A'
  AND fm.status = 'COMPLETED'
GROUP BY fm.unit_id
ORDER BY km_l DESC;

-- ─────────────────────────────────────────────────────────────
-- Q2: Anomaly detection — reciente 3m vs histórico
-- Valida: lógica moving_avg del backend (umbral 20%)
-- Esperado: PIIC-101 muestra ANOMALIA (fuel theft ruta 58)
-- ─────────────────────────────────────────────────────────────
WITH periods AS (
  SELECT
    fm.unit_id,
    CASE
      WHEN fm.start_at >= DATE_SUB('2026-06-22', INTERVAL 3 MONTH)
        THEN 'RECENT'
      ELSE 'HIST'
    END                                         AS period,
    SUM(fm.end_reading - fm.start_reading)      AS km,
    SUM(fm.fuel_liters_loaded)                  AS liters
  FROM fleet_movements fm
  WHERE fm.description = 'SEED_A'
    AND fm.status = 'COMPLETED'
  GROUP BY fm.unit_id, period
),
pivot AS (
  SELECT
    unit_id,
    MAX(CASE WHEN period = 'HIST'   THEN km / NULLIF(liters, 0) END) AS kml_hist,
    MAX(CASE WHEN period = 'RECENT' THEN km / NULLIF(liters, 0) END) AS kml_recent
  FROM periods
  GROUP BY unit_id
)
SELECT
  unit_id,
  ROUND(kml_hist,   4)                                                AS km_l_historico,
  ROUND(kml_recent, 4)                                                AS km_l_reciente,
  ROUND(ABS(kml_recent - kml_hist) / NULLIF(kml_hist, 0) * 100, 2)  AS desviacion_pct,
  CASE
    WHEN ABS(kml_recent - kml_hist) / NULLIF(kml_hist, 0) > 0.20
      THEN 'ANOMALIA'
    ELSE 'NORMAL'
  END                                                                  AS estado
FROM pivot
ORDER BY desviacion_pct DESC;

-- ─────────────────────────────────────────────────────────────
-- Q3: Dormant fleet — días sin actividad
-- Esperado: PIIC-301 > 90 días (ultima ruta ~2026-03-17)
-- ─────────────────────────────────────────────────────────────
SELECT
  fu.id                                                   AS unit_id,
  MAX(DATE(fm.start_at))                                  AS ultima_actividad,
  DATEDIFF('2026-06-22', MAX(fm.start_at))               AS dias_inactivo,
  CASE
    WHEN DATEDIFF('2026-06-22', MAX(fm.start_at)) > 90
      THEN 'DORMIDA'
    ELSE 'ACTIVA'
  END                                                     AS estado
FROM fleet_units fu
LEFT JOIN fleet_movements fm
  ON fm.unit_id = fu.id
  AND fm.description = 'SEED_A'
WHERE fu.id IN ('PIIC-101','PIIC-201','PIIC-202','PIIC-301','PIIC-302','PIIC-303','PIIC-304','PIIC-305')
GROUP BY fu.id
ORDER BY dias_inactivo DESC;

-- ─────────────────────────────────────────────────────────────
-- Q4: VIM Intelligence — confidence score por brandId+modelId+year
-- Esperado: brandId=23 modelId=525 year=2020 → score=1.00 (3/3)
-- ─────────────────────────────────────────────────────────────
SELECT
  fu.brandId,
  fu.modelId,
  fu.year,
  COUNT(DISTINCT fu.id)                                               AS total_unidades,
  COUNT(DISTINCT CASE WHEN fm.id IS NOT NULL THEN fu.id END)          AS unidades_con_historial,
  ROUND(
    COUNT(DISTINCT CASE WHEN fm.id IS NOT NULL THEN fu.id END) /
    NULLIF(COUNT(DISTINCT fu.id), 0), 4)                              AS confidence_score
FROM fleet_units fu
LEFT JOIN fleet_movements fm
  ON fm.unit_id = fu.id
  AND fm.description = 'SEED_A'
GROUP BY fu.brandId, fu.modelId, fu.year
HAVING total_unidades >= 3
   AND confidence_score >= 0.30
ORDER BY confidence_score DESC, total_unidades DESC;

-- ─────────────────────────────────────────────────────────────
-- Q5: Checkpoints — PIIC-302 (ruta 30: seq 2 = SKIPPED)
-- ─────────────────────────────────────────────────────────────
SELECT
  fm.unit_id,
  fm.start_at,
  cp.sequence,
  cp.name,
  cp.status
FROM fleet_route_checkpoints cp
JOIN fleet_movements fm ON fm.id = cp.movement_id
WHERE fm.description = 'SEED_A'
ORDER BY fm.unit_id, cp.sequence;

-- ─────────────────────────────────────────────────────────────
-- Q6: Driver rotation PIIC-201 (4 drivers en ciclo)
-- Esperado: drivers 201,202,203,204 con rutas distribuidas
-- ─────────────────────────────────────────────────────────────
SELECT
  fre.driver_id,
  COUNT(*)                                             AS rutas,
  ROUND(SUM(fm.end_reading - fm.start_reading), 0)   AS km_total,
  ROUND(SUM(fm.fuel_amount), 2)                       AS gasto_mxn
FROM fleet_movements fm
JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
WHERE fm.unit_id = 'PIIC-201'
  AND fm.description = 'SEED_A'
GROUP BY fre.driver_id
ORDER BY fre.driver_id;

-- ─────────────────────────────────────────────────────────────
-- Q7: FULL JOIN stress — 4 tablas, todos los registros SEED_A
-- Valida integridad referencial completa
-- ─────────────────────────────────────────────────────────────
SELECT
  fm.unit_id,
  COUNT(DISTINCT fm.id)       AS movements,
  COUNT(DISTINCT fre.movement_id) AS extensions,
  COUNT(DISTINCT cp.id)       AS checkpoints,
  ROUND(SUM(fm.end_reading - fm.start_reading), 0) AS km_acumulado,
  ROUND(SUM(fm.fuel_amount), 2)                     AS gasto_total_mxn
FROM fleet_movements fm
LEFT JOIN fleet_route_extensions fre ON fre.movement_id = fm.id
LEFT JOIN fleet_route_checkpoints cp  ON cp.movement_id  = fm.id
WHERE fm.description = 'SEED_A'
GROUP BY fm.unit_id
ORDER BY fm.unit_id;

-- ─────────────────────────────────────────────────────────────
-- Q8: Window function — ranking mensual de km/L por unidad
-- Stress de MySQL 8.0 window functions sobre 465 registros
-- ─────────────────────────────────────────────────────────────
SELECT
  unit_id,
  mes,
  ROUND(km_mes / NULLIF(litros_mes, 0), 4)             AS km_l_mes,
  RANK() OVER (PARTITION BY mes ORDER BY
    km_mes / NULLIF(litros_mes, 0) DESC)               AS rank_mes
FROM (
  SELECT
    fm.unit_id,
    DATE_FORMAT(fm.start_at, '%Y-%m')                  AS mes,
    SUM(fm.end_reading - fm.start_reading)              AS km_mes,
    SUM(fm.fuel_liters_loaded)                          AS litros_mes
  FROM fleet_movements fm
  WHERE fm.description = 'SEED_A'
    AND fm.status = 'COMPLETED'
  GROUP BY fm.unit_id, mes
) monthly
ORDER BY mes, rank_mes;

-- ─────────────────────────────────────────────────────────────
-- Q9: Resumen ejecutivo — una sola query, todos los KPIs
-- Subqueries para conductor/checkpoints: evita inflación por JOIN 1:N
-- ─────────────────────────────────────────────────────────────
SELECT
  COUNT(DISTINCT fm.unit_id)                                                                    AS unidades_activas,
  COUNT(DISTINCT fm.id)                                                                         AS total_movimientos,
  ROUND(SUM(fm.end_reading - fm.start_reading) / 1000, 1)                                      AS km_totales_k,
  ROUND(SUM(fm.fuel_liters_loaded), 0)                                                          AS litros_totales,
  ROUND(SUM(fm.end_reading - fm.start_reading) / NULLIF(SUM(fm.fuel_liters_loaded), 0), 4)    AS km_l_flota,
  ROUND(SUM(fm.fuel_amount), 2)                                                                 AS gasto_total_mxn,
  (SELECT COUNT(*) FROM fleet_route_extensions fre2
   JOIN fleet_movements fm2 ON fm2.id = fre2.movement_id
   WHERE fm2.description = 'SEED_A')                                                            AS rutas_con_conductor,
  (SELECT COUNT(*) FROM fleet_route_checkpoints cp2
   JOIN fleet_movements fm2 ON fm2.id = cp2.movement_id
   WHERE fm2.description = 'SEED_A')                                                            AS checkpoints_totales
FROM fleet_movements fm
WHERE fm.description = 'SEED_A';

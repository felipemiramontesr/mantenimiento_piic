-- Migration 169: FC 082 F2b3b — DROP definitivo de las 6 columnas ENUM
-- reemplazadas por su equivalente *_id (FK a common_catalogs) a lo largo
-- de F2a/F2b1/F2b2/F2b3a. Último paso de la normalización ENUM→catálogos.
--
-- PRERREQUISITOS verificados antes de escribir esta migración (Cláusula L,
-- re-lectura de L-CORE + Libro VIII §23 antes de la fase, 2026-07-23):
--   1. F2b3a (write-cutover, los 5 write-paths reales incl. el residual de
--      combustible AUTO en routeService.ts) CERRADA EN FIRME — O✓ Alfa +
--      R✓ Bravo, commits b5adbf05/06581802/ad5dc680.
--   2. F2b3b Paso 1/2 (read-cutover: quitado COALESCE(cc.code, tabla.enum)
--      en 27 puntos de lectura / 7 archivos) — commit a4c601b7.
--   3. Re-grep completo de apps/api/src: CERO referencias a las 6 columnas
--      ENUM crudas, ni lectura ni escritura, en código de producto.
--   4. Cutover de escritura (ad5dc680) confirmado DESPLEGADO EN PROD por Ω
--      vía dashboard Hostinger (apiv1.piic.com.mx, Auto-deployment ON,
--      último deploy completado con ese commit exacto) — condición
--      bloqueante explícita de Bravo ("prohibido dispatchar el DROP sin
--      que este cutover esté desplegado en PROD").
--   5. Backfill 100%: Inv-A confirmada en F2a (6 pending_*=0) y re-verificada
--      en cada fase posterior vía orphan_check.sql — cero filas dependientes
--      del ENUM sin su *_id resuelto (PROD en zero-state operativo, sin
--      tráfico real desde el arranque de F2 completo).
--
-- IDEMPOTENCIA: usa `DROP COLUMN IF EXISTS` (MySQL 8.0.29+ / MariaDB 10.0.2+)
-- en vez del patrón habitual de verificación previa vía information_schema.
-- COLUMNS — esa tabla devuelve vacío en este hosting para consultas de
-- columnas (hallazgo de terreno de la migración 168, confirmado con
-- information_schema.TABLES funcionando normalmente). `DROP COLUMN IF
-- EXISTS` no depende de information_schema en absoluto: si la sintaxis no
-- fuera soportada por el motor de PROD, el ALTER fallaría con un error de
-- sintaxis claro (fail-closed) en vez de comportarse de forma incorrecta.
-- Verificado 2x en local (MariaDB 10.4.32): 1ª corrida DROPea las columnas,
-- 2ª corrida no falla (columna ya ausente, IF EXISTS la ignora en silencio).
--
-- EFECTO SECUNDARIO ESPERADO (verificado en local, no requiere acción):
-- financial_transactions tiene un índice compuesto `idx_cat_period`
-- (category, period). Al DROPear `category`, MySQL/MariaDB reduce el
-- índice automáticamente a `(period)` en vez de fallar o dejarlo roto —
-- confirmado empíricamente en local antes de escribir este archivo. Las
-- otras 5 columnas no tienen índices propios.
--
-- Cero cambio de dominio de negocio: los datos ya viven en category_id/
-- source_id/service_type_id/system_recommended_type_id desde el backfill
-- de F2a y el write-cutover de F2b1/F2b3a. Esta migración solo remueve la
-- columna ENUM ya inerte (sin lectores ni escritores desde F2b3a+F2b3b P1).

SET NAMES utf8mb4;

-- ═══ (1) financial_transactions.category / .source ═══════════════════════
ALTER TABLE financial_transactions
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS source;

-- ═══ (2) fleet_maintenance_extensions.service_type / .system_recommended_type
ALTER TABLE fleet_maintenance_extensions
  DROP COLUMN IF EXISTS service_type,
  DROP COLUMN IF EXISTS system_recommended_type;

-- ═══ (3) fleet_maintenance_logs.service_type ══════════════════════════════
ALTER TABLE fleet_maintenance_logs
  DROP COLUMN IF EXISTS service_type;

-- ═══ (4) route_incidents.category ═════════════════════════════════════════
ALTER TABLE route_incidents
  DROP COLUMN IF EXISTS category;

-- ═══ Verificación — confirma que las 6 columnas ya no existen ════════════
-- SHOW COLUMNS en vez de information_schema.COLUMNS (mismo motivo que 168:
-- esta última devuelve vacío en este hosting para consultas de columnas).
-- Esperado: las 4 consultas devuelven CERO filas (columna inexistente).
SHOW COLUMNS FROM financial_transactions WHERE Field IN ('category','source');
SHOW COLUMNS FROM fleet_maintenance_extensions WHERE Field IN ('service_type','system_recommended_type');
SHOW COLUMNS FROM fleet_maintenance_logs WHERE Field = 'service_type';
SHOW COLUMNS FROM route_incidents WHERE Field = 'category';

-- Verificación adicional — confirma que los datos migraron 100% a *_id y
-- que la app sigue teniendo de dónde leer (cero huérfanos, cero pending).
SELECT 'pending_ft_category_id' k, COUNT(*) v FROM financial_transactions WHERE category_id IS NULL
UNION SELECT 'pending_ft_source_id', COUNT(*) FROM financial_transactions WHERE source_id IS NULL
UNION SELECT 'pending_fme_service_type_id', COUNT(*) FROM fleet_maintenance_extensions WHERE service_type_id IS NULL
UNION SELECT 'pending_fml_service_type_id', COUNT(*) FROM fleet_maintenance_logs WHERE service_type_id IS NULL
UNION SELECT 'pending_ri_category_id', COUNT(*) FROM route_incidents WHERE category_id IS NULL;
-- Esperado: todas las filas en 0 (o el conteo real de filas preexistentes
-- sin *_id resuelto, que Cond.8/orphan_check.sql ya habría atrapado antes
-- de llegar a esta migración).

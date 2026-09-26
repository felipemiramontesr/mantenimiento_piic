-- ============================================================
-- FC197 F3 — Huella de esquema (R-DB-PARITY). Fuente ÚNICA: la usan
-- `scripts/dbParityCheck.ts` (local) y el workflow `db-migrations.yml` (producción).
-- Solo lee information_schema: 0 filas de datos, 0 PII. Imprime un MD5 y un conteo.
--
-- Normalizaciones (medidas el 2026-09-25/26 entre MariaDB 10.4 local y 11.8 prod):
--   · colación: `utf8_*` (10.4) = `utf8mb3_*` (11.8) — mismo juego, otro nombre;
--   · columnas de VISTAS: solo nombre y posición (tipo y default los deduce el motor);
--   · definición de vistas: sin el prefijo `base`. ni comillas invertidas (la base se llama
--     distinto en cada entorno); con eso las 8 vistas coinciden byte a byte.
--   · sin AUTO_INCREMENT (Cond.R-197).
-- Base: la conectada (DATABASE()); dbParityCheck.ts --sql la sustituye por un nombre explícito
-- para pegarla en phpMyAdmin.
-- ============================================================
SET SESSION group_concat_max_len = 100000000;
SET @db := DATABASE();
SELECT MD5(GROUP_CONCAT(x ORDER BY x SEPARATOR '\n')) AS huella_esquema, COUNT(*) AS elementos FROM (
  SELECT CONCAT('T|', table_name, '|', table_type, '|', IFNULL(engine, ''), '|',
                REPLACE(IFNULL(table_collation, ''), 'utf8_', 'utf8mb3_')) AS x
    FROM information_schema.tables WHERE table_schema = @db
  UNION ALL SELECT IF(v.table_name IS NULL,
                CONCAT('C|', c.table_name, '|', c.column_name, '|', c.ordinal_position, '|', c.column_type, '|',
                       c.is_nullable, '|', IFNULL(c.column_default, '<null>'), '|', c.extra, '|',
                       REPLACE(IFNULL(c.collation_name, ''), 'utf8_', 'utf8mb3_')),
                CONCAT('V|', c.table_name, '|', c.column_name, '|', c.ordinal_position))
    FROM information_schema.columns c
    LEFT JOIN information_schema.views v ON v.table_schema = c.table_schema AND v.table_name = c.table_name
    WHERE c.table_schema = @db
  UNION ALL SELECT CONCAT('D|', table_name, '|',
                MD5(REPLACE(REPLACE(view_definition, CONCAT('`', @db, '`.'), ''), '`', '')))
    FROM information_schema.views WHERE table_schema = @db
  UNION ALL SELECT CONCAT('I|', table_name, '|', index_name, '|', seq_in_index, '|', column_name, '|',
                non_unique, '|', IFNULL(sub_part, ''))
    FROM information_schema.statistics WHERE table_schema = @db
  UNION ALL SELECT CONCAT('F|', k.table_name, '|', k.constraint_name, '|', k.column_name, '|',
                k.referenced_table_name, '|', k.referenced_column_name, '|', r.delete_rule, '|', r.update_rule)
    FROM information_schema.key_column_usage k
    JOIN information_schema.referential_constraints r
      ON r.constraint_schema = k.table_schema AND r.constraint_name = k.constraint_name AND r.table_name = k.table_name
    WHERE k.table_schema = @db
) z;

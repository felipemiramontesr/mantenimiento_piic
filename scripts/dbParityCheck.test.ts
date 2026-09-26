import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  FINGERPRINT_SQL_PATH,
  parityVerdict,
  parseFingerprint,
  sqlForDatabase,
} from './dbParityCheck';

/**
 * FC197 F3 — huella de esquema (Regla 23 · R-DB-PARITY). La consulta es la fuente única que corren
 * el script local y el workflow; aquí se prueban su contrato y las normalizaciones medidas entre
 * MariaDB 10.4 (local) y 11.8 (prod).
 */

const SQL = readFileSync(FINGERPRINT_SQL_PATH, 'utf8');
const HASH = '4ea1c9e57740d7ddc34a553a45dcab85';

describe('schemaFingerprint.sql (contrato)', () => {
  it('solo lee information_schema: nada que escriba ni lea tablas de datos', () => {
    const statements = SQL.split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    expect(statements).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE INTO)\b/i);
    expect(statements.match(/FROM information_schema\.\w+/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('normaliza la colación utf8 → utf8mb3 (tablas y columnas)', () => {
    expect(
      SQL.match(/REPLACE\(IFNULL\(\w?\.?\w*collation\w*, ''\), 'utf8_', 'utf8mb3_'\)/g)
    ).toHaveLength(2);
  });

  it('de las vistas: columnas solo por nombre y posición, y definición sin base ni comillas', () => {
    expect(SQL).toContain(
      "CONCAT('V|', c.table_name, '|', c.column_name, '|', c.ordinal_position)"
    );
    expect(SQL).toContain("REPLACE(REPLACE(view_definition, CONCAT('`', @db, '`.'), ''), '`', '')");
  });

  it('no incluye el contador AUTO_INCREMENT de las tablas (Cond.R-197)', () => {
    const statements = SQL.split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    expect(statements).not.toMatch(/auto_increment/i);
  });
});

describe('sqlForDatabase', () => {
  it('sustituye DATABASE() por la base explícita (phpMyAdmin)', () => {
    const sql = sqlForDatabase(SQL, 'u701509674_Mant_piic');

    expect(sql).toContain("SET @db := 'u701509674_Mant_piic';");
    expect(sql).not.toContain('SET @db := DATABASE();');
  });

  it('rechaza un nombre de base con caracteres raros', () => {
    expect(() => sqlForDatabase(SQL, "x'; DROP")).toThrow('Nombre de base inválido');
  });

  it('rechaza una consulta que no declara la base', () => {
    expect(() => sqlForDatabase('SELECT 1;', 'archon')).toThrow('no declara la base');
  });
});

describe('parseFingerprint / parityVerdict', () => {
  it('lee "<md5>\\t<elementos>" de mysql -N -B', () => {
    expect(parseFingerprint(`${HASH}\t925\n`)).toEqual({ hash: HASH, elements: 925 });
  });

  it('salida inesperada ⇒ error', () => {
    expect(() => parseFingerprint('ERROR 1045')).toThrow('Salida inesperada');
  });

  it('misma huella ⇒ MATCH (sin distinguir mayúsculas ni espacios)', () => {
    expect(parityVerdict({ hash: HASH, elements: 925 }, ` ${HASH.toUpperCase()} `)).toBe(
      `PARITY: 100% MATCH (${HASH}, 925 elementos)`
    );
  });

  it('otra huella ⇒ DRIFT', () => {
    expect(parityVerdict({ hash: HASH, elements: 925 }, 'f'.repeat(32))).toMatch(/^PARITY: DRIFT/);
  });
});

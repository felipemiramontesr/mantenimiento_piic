/* eslint-disable no-template-curly-in-string */
/**
 * FC 069 F1 — Tests del chequeo estático A03 Injection (Regla 19 · R-BDD-GHERKIN).
 * Scenario 6 del FC: call-site nuevo con interpolación directa → FAILED; call-site
 * en ALLOWLIST (patrón seguro conocido) → no bloquea.
 * Nota: los fixtures de abajo son fragmentos de código-como-string (simulan
 * contenido de archivo) que intencionalmente contienen `${...}` literal —
 * no es interpolación real de este archivo de test.
 */
import { describe, expect, it } from 'vitest';

import {
  ALLOWLIST,
  findRawSqlViolations,
  filterNewViolations,
  isAllowlisted,
  type RawSqlViolation,
} from './checkNoRawSql';

describe('findRawSqlViolations — detección textual dominio finito', () => {
  it('detecta interpolación directa en db.execute con template literal', () => {
    const violations = findRawSqlViolations({
      'apps/api/src/routes/evil.ts':
        "await db.execute(`SELECT * FROM users WHERE name = '${userInput}'`);",
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({ file: 'apps/api/src/routes/evil.ts', line: 1 });
  });

  it('detecta interpolación directa en connection.query', () => {
    const violations = findRawSqlViolations({
      'x.ts': 'await connection.query(`DELETE FROM t WHERE id = ${id}`);',
    });
    expect(violations).toHaveLength(1);
  });

  it('no marca queries parametrizadas con placeholder `?`', () => {
    const violations = findRawSqlViolations({
      'apps/api/src/routes/safe.ts': "await db.execute('SELECT * FROM users WHERE id = ?', [id]);",
    });
    expect(violations).toHaveLength(0);
  });

  it('no marca template literals sin `.execute|.query` (ej. mensajes de log)', () => {
    const violations = findRawSqlViolations({
      'x.ts': 'console.log(`Usuario ${userId} actualizado`);',
    });
    expect(violations).toHaveLength(0);
  });

  it('reporta múltiples violaciones a través de múltiples archivos', () => {
    const violations = findRawSqlViolations({
      'a.ts': 'await db.execute(`SELECT ${x}`);',
      'b.ts': "await db.execute('SELECT ?', [x]);\nawait db.query(`DELETE ${y}`);",
    });
    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.file)).toEqual(['a.ts', 'b.ts']);
    expect(violations[1].line).toBe(2);
  });
});

describe('isAllowlisted / filterNewViolations — Scenario 6', () => {
  it('call-site conocido y listado (patrón SET dinámico seguro) no bloquea', () => {
    const violation: RawSqlViolation = {
      file: 'apps/api/src/routes/admin.ts',
      line: 174,
      snippet: "await db.execute(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, values);",
    };
    expect(isAllowlisted(violation, ALLOWLIST)).toBe(true);
    expect(filterNewViolations([violation], ALLOWLIST)).toHaveLength(0);
  });

  it('Scenario 6 — call-site NUEVO (no listado) SÍ bloquea, aunque el archivo ya tenga entradas listadas', () => {
    const knownGood: RawSqlViolation = {
      file: 'apps/api/src/routes/admin.ts',
      line: 174,
      snippet: "await db.execute(`UPDATE roles SET ${fields.join(', ')} WHERE id = ?`, values);",
    };
    const newBad: RawSqlViolation = {
      file: 'apps/api/src/routes/admin.ts',
      line: 999,
      snippet: "await db.execute(`SELECT * FROM users WHERE name = '${req.body.name}'`);",
    };
    const result = filterNewViolations([knownGood, newBad], ALLOWLIST);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(newBad);
  });

  it('normaliza separadores de ruta (\\\\ vs /) al comparar contra el ALLOWLIST', () => {
    const violation: RawSqlViolation = {
      file: 'apps\\api\\src\\services\\db.ts',
      line: 40,
      snippet: "connection.query(`SET time_zone = '${MEXICO_TZ_OFFSET}'`);",
    };
    expect(isAllowlisted(violation, ALLOWLIST)).toBe(true);
  });

  it('las 9 violaciones reales de terreno (2026-07-09) están todas cubiertas por el ALLOWLIST', () => {
    // Fija el terreno verificado manualmente al momento del F1 — si crece, se agrega al
    // ALLOWLIST vía FC firmado, nunca silenciosamente.
    expect(ALLOWLIST).toHaveLength(10);
  });
});

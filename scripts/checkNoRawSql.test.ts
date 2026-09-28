/* eslint-disable no-template-curly-in-string */
/**
 * FC 069 F1 — Tests del chequeo estático A03 Injection (Regla 19 · R-BDD-GHERKIN).
 * Scenario 6 del FC: call-site nuevo con interpolación directa → FAILED; call-site
 * en ALLOWLIST (patrón seguro conocido) → no bloquea.
 * Nota: los fixtures de abajo son fragmentos de código-como-string (simulan
 * contenido de archivo) que intencionalmente contienen `${...}` literal —
 * no es interpolación real de este archivo de test.
 */
import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ALLOWLIST,
  collectScannableFiles,
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
      file: 'apps/api/src/services/authUserManagement.repository.ts',
      line: 174,
      snippet: 'await executor.execute(`UPDATE users SET ${setClause} WHERE id = ?`, values);',
    };
    expect(isAllowlisted(violation, ALLOWLIST)).toBe(true);
    expect(filterNewViolations([violation], ALLOWLIST)).toHaveLength(0);
  });

  it('Scenario 6 — call-site NUEVO (no listado) SÍ bloquea, aunque el archivo ya tenga entradas listadas', () => {
    const knownGood: RawSqlViolation = {
      file: 'apps/api/src/services/authUserManagement.repository.ts',
      line: 174,
      snippet: 'await executor.execute(`UPDATE users SET ${setClause} WHERE id = ?`, values);',
    };
    const newBad: RawSqlViolation = {
      file: 'apps/api/src/services/authUserManagement.repository.ts',
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

  it('el terreno vivo está todo cubierto por el ALLOWLIST (6 tras FC 082 F0c)', () => {
    // Fija el terreno verificado manualmente — si crece, se agrega al
    // ALLOWLIST vía FC firmado, nunca silenciosamente. FC 082 F0c retiró las
    // 4 entradas de seedSupercumulosPiic.ts (script muerto con la banda VIM).
    // FC200 F1 retiró admin.ts y crmContracts.ts: ya no cubrían código vivo.
    expect(ALLOWLIST).toHaveLength(6);
  });
});

describe('ALLOWLIST ≡ terreno vivo (FC200 F1 · Inv-1)', () => {
  const repoRoot = join(__dirname, '..');
  const files: Record<string, string> = {};
  collectScannableFiles(join(repoRoot, 'apps/api/src')).forEach((file) => {
    files[relative(repoRoot, file).split(sep).join('/')] = readFileSync(file, 'utf8');
  });
  const live = findRawSqlViolations(files);

  it.each(ALLOWLIST.map((entry) => [`${entry.file} · ${entry.snippetIncludes}`, entry]))(
    'la excepción %s cubre al menos una violación viva (0 excepciones huérfanas)',
    (_label, entry) => {
      expect(live.some((violation) => isAllowlisted(violation, [entry]))).toBe(true);
    }
  );

  it('toda violación viva está cubierta: 0 violaciones nuevas', () => {
    expect(filterNewViolations(live, ALLOWLIST)).toEqual([]);
  });
});

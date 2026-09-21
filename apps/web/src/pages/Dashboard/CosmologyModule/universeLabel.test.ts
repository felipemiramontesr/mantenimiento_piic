import { describe, it, expect } from 'vitest';
import {
  UNIVERSE_LABEL_MAX,
  UNIVERSE_LABEL_MIN,
  describeRenameError,
  normalizeUniverseLabel,
  validateUniverseLabel,
} from './universeLabel';

/** FC192 — espejo web de la validación del servidor (3–100 caracteres normalizados). */

describe('FC192 web — normalizeUniverseLabel', () => {
  it('recorta y colapsa espacios, tabs y saltos de línea', () => {
    expect(normalizeUniverseLabel('  Flota \t  Central\n Norte  ')).toBe('Flota Central Norte');
  });
});

describe('FC192 web — validateUniverseLabel', () => {
  it('acepta un nombre válido y distinto del actual (incluido un cambio solo de mayúsculas)', () => {
    expect(validateUniverseLabel('Universo Beta', 'Universo Alpha')).toBeNull();
    expect(validateUniverseLabel('flota central', 'Flota Central')).toBeNull();
  });

  it('acepta los bordes exactos (3 y 100)', () => {
    expect(validateUniverseLabel('a'.repeat(UNIVERSE_LABEL_MIN), 'Otro')).toBeNull();
    expect(validateUniverseLabel('a'.repeat(UNIVERSE_LABEL_MAX), 'Otro')).toBeNull();
  });

  it('rechaza menos de 3 y más de 100 caracteres, con el motivo en es-MX', () => {
    expect(validateUniverseLabel('ab', 'Otro')).toBe('Mínimo 3 caracteres');
    expect(validateUniverseLabel('', 'Otro')).toBe('Mínimo 3 caracteres');
    expect(validateUniverseLabel('a'.repeat(101), 'Otro')).toBe('Máximo 100 caracteres');
  });

  it('rechaza el mismo nombre que ya tiene (sin cambios)', () => {
    expect(validateUniverseLabel('Universo Alpha', 'Universo Alpha')).toBe(
      'Sin cambios: escribe un nombre distinto'
    );
  });
});

describe('FC192 web — describeRenameError', () => {
  const failure = (code?: string): unknown => ({ response: { data: { code } } });

  it('409 UNIVERSE_NAME_ALREADY_EXISTS ⇒ "Ya existe un universo con este nombre"', () => {
    expect(describeRenameError(failure('UNIVERSE_NAME_ALREADY_EXISTS'))).toBe(
      'Ya existe un universo con este nombre'
    );
  });

  it('400 INVALID_LABEL_LENGTH ⇒ recuerda el rango permitido', () => {
    expect(describeRenameError(failure('INVALID_LABEL_LENGTH'))).toBe(
      'El nombre debe tener entre 3 y 100 caracteres'
    );
  });

  it.each([
    ['otro código', failure('UNIVERSE_CATALOG_DESYNC')],
    ['sin código', failure()],
    ['sin respuesta (red caída)', new Error('Network Error')],
    ['un valor cualquiera', 'texto suelto'],
    ['undefined', undefined],
  ])('%s ⇒ mensaje genérico', (_label, error) => {
    expect(describeRenameError(error)).toBe('No se pudo renombrar el Universo. Intenta de nuevo.');
  });
});

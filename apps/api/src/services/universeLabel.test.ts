import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  LABEL_CONFLICT,
  UniverseMutationError,
  labelFailureCode,
  normalizeUniverseLabel,
  universeLabelSchema,
} from './universeLabel';

/** FC192 — nombre de universo: una sola normalización + un solo esquema para crear y renombrar. */

describe('FC192 — normalizeUniverseLabel', () => {
  it('recorta y colapsa espacios, tabs y saltos de línea a un solo espacio', () => {
    expect(normalizeUniverseLabel('  Flota \t  Central\n Norte  ')).toBe('Flota Central Norte');
  });

  it('no cambia mayúsculas ni acentos (la unicidad los ignora en la BD, no aquí)', () => {
    expect(normalizeUniverseLabel('Ñandú  ÁÉÍ')).toBe('Ñandú ÁÉÍ');
  });
});

describe('FC192 — universeLabelSchema (3–100 caracteres normalizados)', () => {
  it('acepta el borde inferior (3) y superior (100) y devuelve el valor normalizado', () => {
    expect(universeLabelSchema.parse('abc')).toBe('abc');
    expect(universeLabelSchema.parse('a'.repeat(100))).toHaveLength(100);
    expect(universeLabelSchema.parse('  Universo   Beta ')).toBe('Universo Beta');
  });

  it.each([
    ['2 caracteres', 'ab'],
    ['101 caracteres', 'a'.repeat(101)],
    ['vacío', ''],
    ['solo espacios', '     '],
    ['2 caracteres reales rodeados de espacios', '  ab  '],
  ])('rechaza %s', (_label, value) => {
    expect(universeLabelSchema.safeParse(value).success).toBe(false);
  });

  it('rechaza un valor que no es texto', () => {
    expect(universeLabelSchema.safeParse(42).success).toBe(false);
  });
});

describe('FC192 — labelFailureCode', () => {
  const body = z.object({ label: universeLabelSchema, other: z.string() });

  it('INVALID_LABEL_LENGTH cuando el campo culpable es `label`', () => {
    const result = body.safeParse({ label: 'ab', other: 'x' });
    expect(result.success).toBe(false);
    if (!result.success) expect(labelFailureCode(result.error)).toBe('INVALID_LABEL_LENGTH');
  });

  it('VALIDATION_ERROR cuando el culpable es otro campo', () => {
    const result = body.safeParse({ label: 'Universo Beta' });
    expect(result.success).toBe(false);
    if (!result.success) expect(labelFailureCode(result.error)).toBe('VALIDATION_ERROR');
  });
});

describe('FC192 — UniverseMutationError', () => {
  it('lleva la falla semántica (status/code/message) para mapearla a HTTP', () => {
    const error = new UniverseMutationError(LABEL_CONFLICT);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UniverseMutationError');
    expect(error.failure).toEqual({
      status: 409,
      code: 'UNIVERSE_NAME_ALREADY_EXISTS',
      message: 'Ya existe un universo con este nombre',
    });
  });
});

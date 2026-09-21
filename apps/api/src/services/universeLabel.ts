import { z, ZodError } from 'zod';

/**
 * FC192 — nombre de universo: normalización, esquema compartido (crear + renombrar) y fallas
 * semánticas. Módulo puro (sin SQL ni red). Regla de Ω: el nombre es ÚNICO; aquí solo vive la parte
 * sintáctica — la comprobación de unicidad usa la BD (`universeManagement.service.ts`).
 */

export const UNIVERSE_LABEL_MIN = 3;
export const UNIVERSE_LABEL_MAX = 100;

/** `trim()` + colapsa cualquier secuencia de espacios en blanco (espacios, tabs, saltos) a un espacio. */
export function normalizeUniverseLabel(raw: string): string {
  return raw.trim().replaceAll(/\s+/g, ' ');
}

/** Esquema ÚNICO del nombre: se normaliza y luego debe medir de 3 a 100 caracteres. */
export const universeLabelSchema = z
  .string()
  .transform(normalizeUniverseLabel)
  .pipe(z.string().min(UNIVERSE_LABEL_MIN).max(UNIVERSE_LABEL_MAX));

/** Falla semántica de una mutación de universo (mapea 1:1 a la respuesta HTTP). */
export interface UniverseMutationFailure {
  status: number;
  code: string;
  message: string;
}

export const LABEL_CONFLICT: UniverseMutationFailure = {
  status: 409,
  code: 'UNIVERSE_NAME_ALREADY_EXISTS',
  message: 'Ya existe un universo con este nombre',
};

export const TENANT_NOT_FOUND_FAILURE: UniverseMutationFailure = {
  status: 404,
  code: 'TENANT_NOT_FOUND',
  message: 'Universo no encontrado',
};

/** El nombre vive en `tenants` y en `common_catalogs`: si una de las dos filas falta, no se persiste nada. */
export const CATALOG_DESYNC_FAILURE: UniverseMutationFailure = {
  status: 500,
  code: 'UNIVERSE_CATALOG_DESYNC',
  message: 'El universo y su fila de catálogo están desincronizados; no se aplicó ningún cambio',
};

/** Aborta una TX de mutación de universo con una falla semántica (la captura el servicio → HTTP). */
export class UniverseMutationError extends Error {
  constructor(public readonly failure: UniverseMutationFailure) {
    super(failure.code);
    this.name = 'UniverseMutationError';
  }
}

/** `INVALID_LABEL_LENGTH` cuando el campo culpable es `label`; cualquier otro fallo de body es `VALIDATION_ERROR`. */
export function labelFailureCode(error: ZodError): 'INVALID_LABEL_LENGTH' | 'VALIDATION_ERROR' {
  return error.issues.some((issue) => issue.path[0] === 'label')
    ? 'INVALID_LABEL_LENGTH'
    : 'VALIDATION_ERROR';
}

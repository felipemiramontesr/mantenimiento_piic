/**
 * FC192 — nombre de universo (lado web). Espejo de `apps/api/src/services/universeLabel.ts`: mismas
 * cotas (3–100 caracteres NORMALIZADOS) y misma normalización (trim + colapso de espacios), para que
 * la validación en vivo del modal coincida con la del servidor. La unicidad SOLO la decide el servidor.
 */

export const UNIVERSE_LABEL_MIN = 3;
export const UNIVERSE_LABEL_MAX = 100;

/** `trim()` + cualquier secuencia de espacios en blanco (espacios, tabs, saltos) a un solo espacio. */
export function normalizeUniverseLabel(raw: string): string {
  return raw.trim().replaceAll(/\s+/g, ' ');
}

/** `null` si el nombre normalizado se puede guardar; si no, el motivo en es-MX. */
export function validateUniverseLabel(normalized: string, currentLabel: string): string | null {
  if (normalized.length < UNIVERSE_LABEL_MIN) {
    return `Mínimo ${UNIVERSE_LABEL_MIN} caracteres`;
  }
  if (normalized.length > UNIVERSE_LABEL_MAX) {
    return `Máximo ${UNIVERSE_LABEL_MAX} caracteres`;
  }
  if (normalized === currentLabel) return 'Sin cambios: escribe un nombre distinto';
  return null;
}

/** Mensaje es-MX para un fallo del `PATCH .../label` (409 de unicidad, 400 de longitud u otro). */
export function describeRenameError(err: unknown): string {
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
  if (code === 'UNIVERSE_NAME_ALREADY_EXISTS') return 'Ya existe un universo con este nombre';
  if (code === 'INVALID_LABEL_LENGTH') {
    return `El nombre debe tener entre ${UNIVERSE_LABEL_MIN} y ${UNIVERSE_LABEL_MAX} caracteres`;
  }
  return 'No se pudo renombrar el Universo. Intenta de nuevo.';
}

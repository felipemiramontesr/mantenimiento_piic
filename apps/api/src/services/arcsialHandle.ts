/**
 * FC209 (R 540/542_AN) — reglas puras del @handle de Arcsial: identidad pública distinta del username
 * (que en el autoregistro ES el correo). Mismo patrón que el backfill de la migración 185.
 */

export const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;

/** Longitudes del tramo hex del uuid: 'arc_' + 8, y ante colisión 12, 16 y 26 (≤ 30 en total). */
export const HANDLE_HEX_LENGTHS = [8, 12, 16, 26] as const;

const DISPLAY_NAME_MAX = 100;

/** Candidatos `arc_<hex>` en orden, desde el uuid sin guiones (REPLACE(uuid, '-', '')). */
export function handleCandidates(uuid: string): string[] {
  const hex = uuid.replaceAll('-', '').toLowerCase();
  return HANDLE_HEX_LENGTHS.map((length) => `arc_${hex.slice(0, length)}`);
}

/** `display_name`: el nombre completo si viene, si no el handle; recortado a la columna (100). */
export function displayNameFor(fullName: string | null | undefined, handle: string): string {
  const trimmed = fullName?.trim() ?? '';
  return (trimmed === '' ? handle : trimmed).slice(0, DISPLAY_NAME_MAX);
}

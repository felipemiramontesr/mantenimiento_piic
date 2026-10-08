import { z } from 'zod';

/**
 * FC207 F1 (F-DEF1 · T2) — proveedor de mosaicos del mapa de Rastreo. La URL vive SOLO en el entorno
 * del servidor (`MAP_TILES_UPSTREAM_URL`, plantilla con `{z}`, `{x}` y `{y}`; la clave del proveedor
 * va dentro y jamás llega al cliente). Sin URL, o sin las tres marcas, el gateway responde fail-closed.
 */

export const TILE_MAX_ZOOM = 19;

export interface TileCoords {
  readonly z: number;
  readonly x: number;
  readonly y: number;
}

export type TileUpstreamResolution =
  | { readonly ok: true; readonly url: string }
  | {
      readonly ok: false;
      readonly code: 'TILE_UPSTREAM_NOT_CONFIGURED' | 'TILE_UPSTREAM_INVALID_PROTOCOL';
    };

const tileIndex = z
  .string()
  .regex(/^\d{1,7}$/)
  .transform(Number);

/** `z ∈ 0..19` y `x, y ∈ [0, 2^z)`; cualquier otra cosa es `COORDINATES_OUT_OF_BOUNDS`. */
export const tileParamsSchema = z
  .object({ z: tileIndex, x: tileIndex, y: tileIndex })
  .refine(({ z: zoom }) => zoom <= TILE_MAX_ZOOM)
  .refine(({ z: zoom, x, y }) => x < 2 ** zoom && y < 2 ** zoom);

const PLACEHOLDERS = ['{z}', '{x}', '{y}'] as const;

/** T2 — plantilla del entorno → URL del mosaico, o el código fail-closed que corresponde. */
export function resolveTileUpstream(
  template: string | undefined,
  coords: TileCoords
): TileUpstreamResolution {
  const value = template?.trim() ?? '';
  if (value === '' || !PLACEHOLDERS.every((mark) => value.includes(mark))) {
    return { ok: false, code: 'TILE_UPSTREAM_NOT_CONFIGURED' };
  }
  if (!value.startsWith('https://')) return { ok: false, code: 'TILE_UPSTREAM_INVALID_PROTOCOL' };
  const url = value
    .replaceAll('{z}', String(coords.z))
    .replaceAll('{x}', String(coords.x))
    .replaceAll('{y}', String(coords.y));
  return { ok: true, url };
}

/**
 * Host del proveedor configurado, para la allowlist del guard A10 (`outboundFetch`). Sale del entorno
 * del servidor, nunca de la petición; sin URL https válida no se agrega ningún host.
 */
export function configuredTileHost(template: string | undefined): string | null {
  if (!template?.trim().startsWith('https://')) return null;
  try {
    return new URL(template.trim()).hostname;
  } catch {
    return null;
  }
}

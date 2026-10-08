import { describe, it, expect } from 'vitest';
import {
  configuredTileHost,
  resolveTileUpstream,
  tileParamsSchema,
  TILE_MAX_ZOOM,
} from './mapTileUpstream';

/** FC207 F1 (T2) — plantilla del proveedor de mosaicos y límites de coordenadas. */

const COORDS = { z: 3, x: 2, y: 5 };

describe('tileParamsSchema', () => {
  it('acepta z ∈ 0..19 y x, y ∈ [0, 2^z)', () => {
    expect(tileParamsSchema.parse({ z: '3', x: '7', y: '0' })).toEqual({ z: 3, x: 7, y: 0 });
    expect(tileParamsSchema.safeParse({ z: String(TILE_MAX_ZOOM), x: '0', y: '0' }).success).toBe(
      true
    );
  });

  it.each([
    { z: '20', x: '0', y: '0' },
    { z: '3', x: '8', y: '0' },
    { z: '3', x: '0', y: '8' },
    { z: '-1', x: '0', y: '0' },
    { z: '3', x: '', y: '0' },
    { z: '3', x: '0', y: '0x1' },
  ])('rechaza %o', (params) => {
    expect(tileParamsSchema.safeParse(params).success).toBe(false);
  });
});

describe('resolveTileUpstream', () => {
  it('sustituye {z}, {x} y {y} en la plantilla https', () => {
    expect(resolveTileUpstream(' https://t.example.com/{z}/{x}/{y}.png?k=1 ', COORDS)).toEqual({
      ok: true,
      url: 'https://t.example.com/3/2/5.png?k=1',
    });
  });

  it.each([undefined, '', '   ', 'https://t.example.com/{z}/{x}.png'])(
    'sin plantilla completa (%s): TILE_UPSTREAM_NOT_CONFIGURED',
    (template) => {
      expect(resolveTileUpstream(template, COORDS)).toEqual({
        ok: false,
        code: 'TILE_UPSTREAM_NOT_CONFIGURED',
      });
    }
  );

  it('plantilla no https: TILE_UPSTREAM_INVALID_PROTOCOL', () => {
    expect(resolveTileUpstream('http://t.example.com/{z}/{x}/{y}.png', COORDS)).toEqual({
      ok: false,
      code: 'TILE_UPSTREAM_INVALID_PROTOCOL',
    });
  });
});

describe('configuredTileHost', () => {
  it('devuelve el host de una plantilla https', () => {
    expect(configuredTileHost('https://tiles.example.com/{z}/{x}/{y}.png')).toBe(
      'tiles.example.com'
    );
  });

  it.each([undefined, '', 'http://tiles.example.com/{z}', 'https://exa mple.com/{z}'])(
    'sin URL https válida (%s) no agrega host',
    (template) => {
      expect(configuredTileHost(template)).toBeNull();
    }
  );
});

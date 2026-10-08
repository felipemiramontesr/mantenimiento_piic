import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';
import api from '../../api/client';
import SovereignTileLayer, {
  AuthenticatedTileLayer,
  fetchTileBlob,
  TILE_ATTRIBUTION,
} from './SovereignTileLayer';

/**
 * FC207 F1 (F-DEF1) — cada mosaico se pide al gateway con el cliente `api` (Bearer) como blob y se
 * muestra desde un objeto URL que se revoca al cargar, al fallar o al retirar la capa.
 */

vi.mock('../../api/client', () => ({ default: { get: vi.fn() } }));

const COORDS = { x: 7, y: 13, z: 5 } as L.Coords;
const BLOB = new Blob(['png'], { type: 'image/png' });
let urlSeq = 0;
const createObjectURL = vi.fn((): string => {
  urlSeq += 1;
  return `blob:tile-${urlSeq}`;
});
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.mocked(api.get).mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Crea el mosaico y espera a que la promesa del blob asigne su `src` (o falle). */
async function createTile(done: L.DoneCallback): Promise<HTMLImageElement> {
  const tile = new AuthenticatedTileLayer('').createTile(COORDS, done) as HTMLImageElement;
  await vi.waitFor(() => expect(api.get).toHaveBeenCalled());
  await Promise.resolve();
  await Promise.resolve();
  return tile;
}

describe('fetchTileBlob', () => {
  it('pide el PNG al gateway con la sesión del cliente api, como blob', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: BLOB });
    await expect(fetchTileBlob(COORDS)).resolves.toBe(BLOB);
    expect(api.get).toHaveBeenCalledWith('/telemetry/tiles/5/7/13.png', { responseType: 'blob' });
  });
});

describe('AuthenticatedTileLayer.createTile', () => {
  it('al cargar, entrega el mosaico y revoca su objeto URL', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: BLOB });
    const done = vi.fn();
    const tile = await createTile(done);
    expect(tile.getAttribute('role')).toBe('presentation');
    expect(tile.src).toBe('blob:tile-1');
    tile.dispatchEvent(new Event('load'));
    expect(done).toHaveBeenCalledWith(undefined, tile);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:tile-1');
  });

  it('si la imagen no decodifica, reporta error y revoca igual', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: BLOB });
    const done = vi.fn();
    const tile = await createTile(done);
    tile.dispatchEvent(new Event('error'));
    expect(done).toHaveBeenCalledWith(expect.any(Error), tile);
    expect(revokeObjectURL).toHaveBeenCalledWith(tile.src);
  });

  it.each([
    ['un Error', new Error('502'), '502'],
    ['otra cosa', 'boom', 'tile'],
  ])(
    'si el gateway falla con %s, reporta el error sin crear objeto URL',
    async (_l, reason, message) => {
      vi.mocked(api.get).mockRejectedValue(reason);
      const done = vi.fn();
      const tile = await createTile(done);
      await vi.waitFor(() => expect(done).toHaveBeenCalled());
      expect(done.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((done.mock.calls[0][0] as Error).message).toBe(message);
      expect(done.mock.calls[0][1]).toBe(tile);
      expect(createObjectURL).not.toHaveBeenCalled();
    }
  );
});

describe('SovereignTileLayer', () => {
  it('monta la capa con atribución en el mapa y al retirarla revoca los objetos URL pendientes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: BLOB });
    const addTo = vi.spyOn(AuthenticatedTileLayer.prototype, 'addTo');
    const { unmount } = render(
      <MapContainer center={[23.6, -102.5]} zoom={5} style={{ height: 100 }}>
        <SovereignTileLayer />
      </MapContainer>
    );
    expect(addTo).toHaveBeenCalledTimes(1);
    const layer = addTo.mock.contexts[0] as AuthenticatedTileLayer;
    expect(layer.getAttribution?.()).toBe(TILE_ATTRIBUTION);

    layer.createTile(COORDS, vi.fn());
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith(`blob:tile-${urlSeq}`);
  });
});

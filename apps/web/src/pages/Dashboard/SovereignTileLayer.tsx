import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../api/client';

/**
 * FC207 F1 (F-DEF1) — capa de mosaicos del mapa de Rastreo servida por el gateway soberano
 * `GET /v1/telemetry/tiles/:z/:x/:y.png`. Un `<img src>` nativo no lleva el Bearer, así que cada
 * mosaico se pide con el cliente `api` como blob y se muestra desde un objeto URL en memoria, que se
 * revoca al cargar, al fallar o al desmontar la capa. La clave del proveedor vive solo en el servidor.
 */

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Pide el PNG del mosaico al gateway con la sesión del usuario. */
export async function fetchTileBlob(coords: L.Coords): Promise<Blob> {
  const res = await api.get<Blob>(`/telemetry/tiles/${coords.z}/${coords.x}/${coords.y}.png`, {
    responseType: 'blob',
  });
  return res.data;
}

/** `L.TileLayer` cuyo `createTile` carga el mosaico autenticado en lugar de un `src` directo. */
export class AuthenticatedTileLayer extends L.TileLayer {
  private readonly objectUrls = new Set<string>();

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img');
    tile.alt = '';
    tile.setAttribute('role', 'presentation');
    fetchTileBlob(coords)
      .then((blob) => this.showTile(tile, URL.createObjectURL(blob), done))
      .catch((error: unknown) => done(error instanceof Error ? error : new Error('tile'), tile));
    return tile;
  }

  onRemove(map: L.Map): this {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();
    return super.onRemove(map);
  }

  /** Pinta el objeto URL y lo revoca en cuanto el navegador lo decodificó (o falló). */
  private showTile(tile: HTMLImageElement, url: string, done: L.DoneCallback): void {
    this.objectUrls.add(url);
    const release = (): void => {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(url);
    };
    tile.addEventListener(
      'load',
      () => {
        release();
        done(undefined, tile);
      },
      { once: true }
    );
    tile.addEventListener(
      'error',
      () => {
        release();
        done(new Error('tile'), tile);
      },
      { once: true }
    );
    tile.setAttribute('src', url);
  }
}

/** Monta la capa autenticada en el mapa de react-leaflet y la retira al desmontar. */
export default function SovereignTileLayer(): null {
  const map = useMap();
  useEffect(() => {
    const layer = new AuthenticatedTileLayer('', { attribution: TILE_ATTRIBUTION, maxZoom: 19 });
    layer.addTo(map);
    return (): void => {
      layer.remove();
    };
  }, [map]);
  return null;
}

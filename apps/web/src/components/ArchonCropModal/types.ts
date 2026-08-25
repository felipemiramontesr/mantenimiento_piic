export interface CropOffset {
  x: number;
  y: number;
}

export interface NaturalSize {
  w: number;
  h: number;
}

export interface DragOrigin {
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
}

export const CROP_SIZE = 320;
export const OUTPUT_SIZE = 800;
export const ZOOM_STEP = 1.2;
export const PAN_STEP = 10;

/** Escala mínima que cubre el viewport de encuadre con la imagen a su tamaño natural. */
export function getMinScale(nw: number, nh: number): number {
  if (nw === 0 || nh === 0) return 1;
  return Math.max(CROP_SIZE / nw, CROP_SIZE / nh);
}

/** Restringe el offset de arrastre para que la imagen nunca deje espacio vacío en el viewport. */
export function clampOffset(ox: number, oy: number, s: number, nw: number, nh: number): CropOffset {
  return {
    x: Math.min(0, Math.max(CROP_SIZE - nw * s, ox)),
    y: Math.min(0, Math.max(CROP_SIZE - nh * s, oy)),
  };
}

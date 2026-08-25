import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, SetStateAction } from 'react';
import { CropOffset, NaturalSize, PAN_STEP, clampOffset } from './types';

export interface KeyboardPanDeps {
  offset: CropOffset;
  scale: number;
  naturalSize: NaturalSize;
  setOffset: Dispatch<SetStateAction<CropOffset>>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
}

/**
 * Equivalente de teclado del arrastre/zoom con mouse (FC163 F2B2, S6848 — el viewport de
 * encuadre no es un elemento nativo, requiere soporte de teclado explícito). Flechas mueven
 * la imagen en el mismo sentido que arrastrarla con el mouse; +/- hacen zoom.
 */
export function useCropKeyboardPan({
  offset,
  scale,
  naturalSize,
  setOffset,
  handleZoomIn,
  handleZoomOut,
}: KeyboardPanDeps): (e: ReactKeyboardEvent) => void {
  const { w, h } = naturalSize;
  const pan = (dx: number, dy: number): void => {
    setOffset(clampOffset(offset.x + dx, offset.y + dy, scale, w, h));
  };

  const keyActions: Record<string, () => void> = {
    ArrowUp: () => pan(0, -PAN_STEP),
    ArrowDown: () => pan(0, PAN_STEP),
    ArrowLeft: () => pan(-PAN_STEP, 0),
    ArrowRight: () => pan(PAN_STEP, 0),
    '+': handleZoomIn,
    '=': handleZoomIn,
    '-': handleZoomOut,
  };

  return (e: ReactKeyboardEvent): void => {
    const action = keyActions[e.key];
    if (!action) return;
    e.preventDefault();
    action();
  };
}

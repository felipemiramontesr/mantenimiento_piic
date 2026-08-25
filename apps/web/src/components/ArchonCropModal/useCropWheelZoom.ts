import { type RefObject, useEffect, useRef } from 'react';
import { CropOffset, NaturalSize, ZOOM_STEP } from './types';

export interface WheelZoomDeps {
  containerRef: RefObject<HTMLDivElement>;
  scale: number;
  offset: CropOffset;
  naturalSize: NaturalSize;
  applyZoom: (newScale: number, currentOffset: CropOffset, nw: number, nh: number) => void;
}

/** Zoom con rueda del mouse sobre el viewport de encuadre (FC163 F2B2, split de ArchonCropModal). */
export function useCropWheelZoom({
  containerRef,
  scale,
  offset,
  naturalSize,
  applyZoom,
}: WheelZoomDeps): void {
  const stateRef = useRef({ scale, offset, naturalSize, applyZoom });
  useEffect(() => {
    stateRef.current = { scale, offset, naturalSize, applyZoom };
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const { scale: s, offset: o, naturalSize: ns, applyZoom: az } = stateRef.current;
      const delta = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      az(s * delta, o, ns.w, ns.h);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return (): void => container.removeEventListener('wheel', handleWheel);
  }, [containerRef]);
}

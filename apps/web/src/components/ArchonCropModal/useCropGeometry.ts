import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react';
import { CROP_SIZE, CropOffset, NaturalSize, ZOOM_STEP, clampOffset, getMinScale } from './types';

export interface UseCropGeometryResult {
  imgRef: RefObject<HTMLImageElement>;
  scale: number;
  offset: CropOffset;
  setOffset: Dispatch<SetStateAction<CropOffset>>;
  naturalSize: NaturalSize;
  applyZoom: (newScale: number, currentOffset: CropOffset, nw: number, nh: number) => void;
  onImageLoad: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
}

/** Escala/offset/tamaño natural de la imagen + zoom in/out (FC163 F2B2, split de ArchonCropModal). */
export function useCropGeometry(): UseCropGeometryResult {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<NaturalSize>({ w: 1, h: 1 });

  const applyZoom = useCallback(
    (newScale: number, currentOffset: CropOffset, nw: number, nh: number): void => {
      const minScale = getMinScale(nw, nh);
      const clamped = Math.min(minScale * 4, Math.max(minScale, newScale));
      setScale(clamped);
      setOffset(clampOffset(currentOffset.x, currentOffset.y, clamped, nw, nh));
    },
    []
  );

  const onImageLoad = useCallback((): void => {
    const img = imgRef.current;
    if (!img) return;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const minScale = getMinScale(nw, nh);
    setNaturalSize({ w: nw, h: nh });
    setScale(minScale);
    setOffset({
      x: (CROP_SIZE - nw * minScale) / 2,
      y: (CROP_SIZE - nh * minScale) / 2,
    });
  }, []);

  const handleZoomIn = useCallback((): void => {
    applyZoom(scale * ZOOM_STEP, offset, naturalSize.w, naturalSize.h);
  }, [applyZoom, scale, offset, naturalSize]);

  const handleZoomOut = useCallback((): void => {
    applyZoom(scale / ZOOM_STEP, offset, naturalSize.w, naturalSize.h);
  }, [applyZoom, scale, offset, naturalSize]);

  return {
    imgRef,
    scale,
    offset,
    setOffset,
    naturalSize,
    applyZoom,
    onImageLoad,
    handleZoomIn,
    handleZoomOut,
  };
}

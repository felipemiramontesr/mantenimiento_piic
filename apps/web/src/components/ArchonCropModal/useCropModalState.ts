import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
} from 'react';
import { useCropConfirm } from './useCropConfirm';
import { useCropDrag } from './useCropDrag';
import { useCropGeometry } from './useCropGeometry';
import { useCropKeyboardPan } from './useCropKeyboardPan';
import { useCropWheelZoom } from './useCropWheelZoom';
import { CropOffset, NaturalSize } from './types';

export interface UseCropModalStateResult {
  imgRef: RefObject<HTMLImageElement>;
  containerRef: RefObject<HTMLDivElement>;
  scale: number;
  offset: CropOffset;
  naturalSize: NaturalSize;
  onImageLoad: () => void;
  onMouseDown: (e: ReactMouseEvent) => void;
  onViewportKeyDown: (e: ReactKeyboardEvent) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleConfirm: () => void;
}

/** Compone geometría + arrastre + rueda + teclado + confirmación del crop modal (FC163 F2B2, split de ArchonCropModal). */
export function useCropModalState(onConfirm: (dataUrl: string) => void): UseCropModalStateResult {
  const {
    imgRef,
    scale,
    offset,
    setOffset,
    naturalSize,
    onImageLoad,
    applyZoom,
    handleZoomIn,
    handleZoomOut,
  } = useCropGeometry();

  const { containerRef, onMouseDown } = useCropDrag({ offset, scale, naturalSize, setOffset });
  useCropWheelZoom({ containerRef, scale, offset, naturalSize, applyZoom });

  const onViewportKeyDown = useCropKeyboardPan({
    offset,
    scale,
    naturalSize,
    setOffset,
    handleZoomIn,
    handleZoomOut,
  });

  const handleConfirm = useCropConfirm({ imgRef, offset, scale, onConfirm });

  return {
    imgRef,
    containerRef,
    scale,
    offset,
    naturalSize,
    onImageLoad,
    onMouseDown,
    onViewportKeyDown,
    handleZoomIn,
    handleZoomOut,
    handleConfirm,
  };
}

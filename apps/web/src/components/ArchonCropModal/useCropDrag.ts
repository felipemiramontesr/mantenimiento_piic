import {
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { CropOffset, DragOrigin, NaturalSize, clampOffset } from './types';

interface DragDeps {
  offset: CropOffset;
  scale: number;
  naturalSize: NaturalSize;
  setOffset: Dispatch<SetStateAction<CropOffset>>;
}

export interface UseCropDragResult {
  containerRef: RefObject<HTMLDivElement>;
  onMouseDown: (e: ReactMouseEvent) => void;
}

/** Arrastre de la imagen con mouse, via listeners en window (FC163 F2B2, split de ArchonCropModal). */
export function useCropDrag({
  offset,
  scale,
  naturalSize,
  setOffset,
}: DragDeps): UseCropDragResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const dragOrigin = useRef<DragOrigin>({ clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 });
  const liveRef = useRef({ scale, naturalSize });
  useEffect(() => {
    liveRef.current = { scale, naturalSize };
  });

  const handleMouseMove = useCallback(
    (e: MouseEvent): void => {
      if (!isDragging.current) return;
      const { w, h } = liveRef.current.naturalSize;
      const s = liveRef.current.scale;
      const dx = e.clientX - dragOrigin.current.clientX;
      const dy = e.clientY - dragOrigin.current.clientY;
      setOffset(
        clampOffset(dragOrigin.current.offsetX + dx, dragOrigin.current.offsetY + dy, s, w, h)
      );
    },
    [setOffset]
  );

  const handleMouseUp = useCallback((): void => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return (): void => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const onMouseDown = (e: ReactMouseEvent): void => {
    isDragging.current = true;
    dragOrigin.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  return { containerRef, onMouseDown };
}

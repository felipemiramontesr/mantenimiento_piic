import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';

interface CropOffset {
  x: number;
  y: number;
}

interface NaturalSize {
  w: number;
  h: number;
}

interface DragOrigin {
  clientX: number;
  clientY: number;
  offsetX: number;
  offsetY: number;
}

export interface ArchonCropModalProps {
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CROP_SIZE = 320;
const OUTPUT_SIZE = 800;
const ZOOM_STEP = 1.2;

function getMinScale(nw: number, nh: number): number {
  if (nw === 0 || nh === 0) return 1;
  return Math.max(CROP_SIZE / nw, CROP_SIZE / nh);
}

function clampOffset(ox: number, oy: number, s: number, nw: number, nh: number): CropOffset {
  return {
    x: Math.min(0, Math.max(CROP_SIZE - nw * s, ox)),
    y: Math.min(0, Math.max(CROP_SIZE - nh * s, oy)),
  };
}

const ArchonCropModal: React.FC<ArchonCropModalProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);
  const dragOrigin = useRef<DragOrigin>({ clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 });

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

  // Non-passive wheel listener to prevent page scroll while zooming
  const wheelStateRef = useRef({ scale, offset, naturalSize, applyZoom });
  useEffect(() => {
    wheelStateRef.current = { scale, offset, naturalSize, applyZoom };
  });

  useEffect(() => {
    const container = containerRef.current;
    let cleanup: (() => void) | undefined;
    if (container) {
      const handleWheel = (e: WheelEvent): void => {
        e.preventDefault();
        const { scale: s, offset: o, naturalSize: ns, applyZoom: az } = wheelStateRef.current;
        const delta = e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
        az(s * delta, o, ns.w, ns.h);
      };
      container.addEventListener('wheel', handleWheel, { passive: false });
      cleanup = (): void => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
    return cleanup;
  }, []);

  // Mouse drag via window events to handle fast cursor movement outside container
  const handleMouseMove = useCallback((e: MouseEvent): void => {
    if (!isDragging.current) return;
    const { w, h } = wheelStateRef.current.naturalSize;
    const s = wheelStateRef.current.scale;
    const dx = e.clientX - dragOrigin.current.clientX;
    const dy = e.clientY - dragOrigin.current.clientY;
    setOffset(
      clampOffset(dragOrigin.current.offsetX + dx, dragOrigin.current.offsetY + dy, s, w, h)
    );
  }, []);

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

  const onMouseDown = (e: React.MouseEvent): void => {
    isDragging.current = true;
    dragOrigin.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handleZoomIn = (): void => {
    applyZoom(scale * ZOOM_STEP, offset, naturalSize.w, naturalSize.h);
  };

  const handleZoomOut = (): void => {
    applyZoom(scale / ZOOM_STEP, offset, naturalSize.w, naturalSize.h);
  };

  const handleConfirm = (): void => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const srcX = -offset.x / scale;
    const srcY = -offset.y / scale;
    const srcSize = CROP_SIZE / scale;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onConfirm(canvas.toDataURL('image/jpeg', 0.92));
  };

  return createPortal(
    <div
      data-testid="archon-crop-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
    >
      <div className="bg-white rounded-[4px] p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-black text-[#0f2a44] uppercase tracking-widest">
            Encuadrar foto
          </span>
          <button
            type="button"
            onClick={onCancel}
            title="Cancelar"
            className="flex items-center justify-center w-8 h-8 text-slate-400 hover:text-slate-700 border-0 bg-transparent outline-none transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 -mt-2">
          Arrastra para encuadrar · rueda del ratón para zoom
        </p>

        {/* Crop viewport */}
        <div
          ref={containerRef}
          data-testid="crop-viewport"
          className="relative overflow-hidden rounded-[4px] cursor-grab active:cursor-grabbing select-none bg-slate-900"
          style={{ width: CROP_SIZE, height: CROP_SIZE }}
          onMouseDown={onMouseDown}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="crop-preview"
            draggable={false}
            onLoad={onImageLoad}
            style={{
              position: 'absolute',
              left: offset.x,
              top: offset.y,
              width: naturalSize.w * scale,
              height: naturalSize.h * scale,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          {/* Regla de tercios */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: `${CROP_SIZE / 3}px ${CROP_SIZE / 3}px`,
            }}
          />
        </div>

        {/* Zoom controls + confirm */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              title="Alejar"
              className="flex items-center justify-center w-9 h-9 rounded-[4px] bg-slate-100 hover:bg-slate-200 border-0 outline-none text-slate-600 transition-colors"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              title="Acercar"
              className="flex items-center justify-center w-9 h-9 rounded-[4px] bg-slate-100 hover:bg-slate-200 border-0 outline-none text-slate-600 transition-colors"
            >
              <ZoomIn size={15} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            data-testid="crop-confirm"
            className="flex items-center gap-2 px-5 py-2 bg-[#0f2a44] text-white text-[11px] font-black uppercase tracking-widest rounded-[4px] border-0 outline-none hover:bg-[#1a3a5c] transition-colors"
          >
            <Check size={13} />
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ArchonCropModal;

import React from 'react';
import { CROP_SIZE, CropOffset, NaturalSize } from './types';

export interface CropViewportProps {
  containerRef: React.RefObject<HTMLDivElement>;
  imgRef: React.RefObject<HTMLImageElement>;
  imageSrc: string;
  offset: CropOffset;
  scale: number;
  naturalSize: NaturalSize;
  onMouseDown: (e: React.MouseEvent) => void;
  onImageLoad: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Área de encuadre arrastrable + zoom por rueda (FC163 F2B2, S6848 — no es un elemento nativo,
 * requiere role/aria-label/tabIndex + equivalente de teclado explícitos).
 */
export const CropViewport: React.FC<CropViewportProps> = ({
  containerRef,
  imgRef,
  imageSrc,
  offset,
  scale,
  naturalSize,
  onMouseDown,
  onImageLoad,
  onKeyDown,
}) => (
  <div
    ref={containerRef}
    data-testid="crop-viewport"
    role="group"
    aria-label="Área de encuadre de imagen — flechas para mover, + y - para zoom"
    tabIndex={0}
    className="relative overflow-hidden rounded-[4px] cursor-grab active:cursor-grabbing select-none bg-slate-900"
    style={{ width: CROP_SIZE, height: CROP_SIZE }}
    onMouseDown={onMouseDown}
    onKeyDown={onKeyDown}
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
);

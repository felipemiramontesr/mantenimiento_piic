import React from 'react';
import { CROP_SIZE, CropOffset, NaturalSize, getMinScale } from './types';

/** Cuadrícula de regla de tercios superpuesta al viewport de encuadre (FC163 F2B5, split). */
function RuleOfThirdsOverlay(): React.JSX.Element {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
        backgroundSize: `${CROP_SIZE / 3}px ${CROP_SIZE / 3}px`,
      }}
    />
  );
}

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
 * requiere role/aria-label/tabIndex + equivalente de teclado explícitos). role="slider" (FC163
 * F2B5, S6845/235_AN+236_AN — "application" no desciende de "widget" en aria-query, nunca
 * satisface no-noninteractive-tabindex; "slider" sí es un ARIA Widget canónico) expone el zoom
 * actual como porcentaje relativo a la escala mínima que cubre el viewport (100% = totalmente
 * alejado/minScale, 400% = zoom máximo, 4x minScale — el rango real de applyZoom en
 * useCropGeometry.ts, no un 100-300% absoluto).
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
}) => {
  const minScale = getMinScale(naturalSize.w, naturalSize.h);
  const zoomPercent = minScale > 0 ? Math.round((scale / minScale) * 100) : 100;
  return (
    <div
      ref={containerRef}
      data-testid="crop-viewport"
      role="slider"
      aria-label="Área de encuadre de imagen — flechas para mover, + y - para zoom"
      aria-valuenow={zoomPercent}
      aria-valuemin={100}
      aria-valuemax={400}
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
      <RuleOfThirdsOverlay />
    </div>
  );
};

import type { RefObject } from 'react';
import { CROP_SIZE, CropOffset, OUTPUT_SIZE } from './types';

export interface ConfirmDeps {
  imgRef: RefObject<HTMLImageElement>;
  offset: CropOffset;
  scale: number;
  onConfirm: (dataUrl: string) => void;
}

/** Recorta la imagen al canvas de salida y entrega el data URL final (FC163 F2B2, split de ArchonCropModal). */
export function useCropConfirm({ imgRef, offset, scale, onConfirm }: ConfirmDeps): () => void {
  return (): void => {
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
}

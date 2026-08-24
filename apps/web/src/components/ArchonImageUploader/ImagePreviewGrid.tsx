import React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';

interface ImagePreviewItemProps {
  src: string;
  idx: number;
  variant: 'square' | 'circle';
  disabled: boolean;
  onRemove: (idx: number) => void;
}

/** Miniatura individual con botón de eliminar (FC163 F1B-2, split Alfa 219_AN — movido a archivo hermano por max-lines:400). */
function ImagePreviewItem({
  src,
  idx,
  variant,
  disabled,
  onRemove,
}: ImagePreviewItemProps): React.JSX.Element {
  return (
    <div
      className={`relative group animate-in fade-in zoom-in duration-300 ${
        variant === 'circle' ? 'w-48 h-48 mx-auto' : 'aspect-square'
      }`}
    >
      <div className="w-full h-full overflow-hidden border border-[#0f2a44]/10 rounded-[4px]">
        <img
          src={src}
          alt={`Vista ${idx + 1}`}
          className="w-full h-full object-contain bg-slate-100"
          loading="lazy"
        />
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onRemove(idx);
          }}
          className="absolute top-[5px] right-[5px] text-[#f2b705] opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110 border-0 bg-transparent outline-none focus:outline-none"
        >
          <X size={18} strokeWidth={1} />
        </button>
      )}
      {variant === 'square' && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-4 pointer-events-none">
          <span className="text-archon-xs text-white font-black uppercase tracking-tighter shadow-sm">
            Slot 0{idx + 1}
          </span>
        </div>
      )}
    </div>
  );
}

export interface ImagePreviewGridProps {
  images: string[];
  maxImages: number;
  compact: boolean;
  variant: 'square' | 'circle';
  disabled: boolean;
  onRemove: (idx: number) => void;
}

/** Grilla de miniaturas + slots vacíos (FC163 F1B-2, split Alfa 219_AN — movido a archivo hermano por max-lines:400). */
export function ImagePreviewGrid({
  images,
  maxImages,
  compact,
  variant,
  disabled,
  onRemove,
}: ImagePreviewGridProps): React.JSX.Element {
  return (
    <div className={`grid grid-cols-4 ${compact ? 'gap-2' : 'gap-12'}`}>
      {images.map((src, idx) => (
        <ImagePreviewItem
          key={idx}
          src={src}
          idx={idx}
          variant={variant}
          disabled={disabled}
          onRemove={onRemove}
        />
      ))}

      {/* Empty slots — dashed fill to reinforce grid capacity */}
      {Array.from({ length: maxImages - images.length }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className={`${
            variant === 'circle' ? 'w-48 h-48 mx-auto' : 'aspect-square'
          } rounded-[4px] border border-dashed border-[#0f2a44]/5 bg-gray-50/30 flex items-center justify-center text-[#0f2a44]/10`}
        >
          <ImageIcon size={16} />
        </div>
      ))}
    </div>
  );
}

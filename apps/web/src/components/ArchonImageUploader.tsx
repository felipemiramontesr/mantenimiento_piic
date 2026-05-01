import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, UploadCloud } from 'lucide-react';

// ⚡ ARCHON IMAGE PROTOCOL: DRAG & DROP UPLOADER
// High-fidelity industrial visual identity component with 4-slot limit

interface ArchonImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  onFileChange?: (files: File[]) => void;
  title?: string;
  allowedFormats?: string;
  accept?: string;
  variant?: 'square' | 'circle';
}

const ArchonImageUploader: React.FC<ArchonImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 4,
  onFileChange,
  title = 'Arrastra imágenes de la unidad',
  allowedFormats = 'JPG, PNG, WEBP',
  accept = 'image/*',
  variant = 'square',
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | File[]): void => {
    let newImages = [...images];

    // If maxImages is 1, auto-replace the existing image
    if (maxImages === 1 && files.length > 0) {
      newImages = [];
    }

    const selectedFiles: File[] = [];
    Array.from(files).forEach((file: File): void => {
      if (newImages.length < maxImages && file.type.startsWith('image/')) {
        selectedFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>): void => {
          const result = e.target?.result as string;
          if (result && !newImages.includes(result)) {
            newImages.push(result);
            onChange([...newImages]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    if (onFileChange) {
      onFileChange(selectedFiles);
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number): void => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={(): void => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-24 transition-all duration-300 cursor-pointer
          flex flex-col items-center justify-center gap-12 group
          ${
            isDragging
              ? 'border-[#f2b705] bg-[#f2b705]/5 shadow-[0_0_20px_rgba(242,183,5,0.1)]'
              : 'border-[#0f2a44]/10 hover:border-[#f2b705]/40 bg-gray-50/50'
          }
        `}
      >
        <input
          type="file"
          multiple={maxImages > 1}
          accept={accept}
          className="hidden"
          ref={fileInputRef}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        <div
          className={`
          p-12 rounded-full transition-transform duration-500
          ${
            isDragging
              ? 'bg-[#f2b705] text-[#0f2a44] scale-110'
              : 'bg-[#0f2a44]/5 text-[#0f2a44]/40 group-hover:scale-110'
          }
        `}
        >
          <UploadCloud size={24} />
        </div>

        <div className="text-center">
          <p className="text-[#0f2a44] font-bold text-sm">
            {isDragging ? '¡Suelta para capturar!' : title}
          </p>
          <p className="text-[10px] uppercase tracking-widest opacity-40 mt-4">
            Máximo {maxImages} fotos • {allowedFormats}
          </p>
        </div>
      </div>

      {/* Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-12">
          {images.map(
            (src, idx): React.ReactElement => (
              <div
                key={idx}
                className={`relative group animate-in fade-in zoom-in duration-300 ${
                  variant === 'circle' ? 'w-48 h-48 mx-auto' : 'aspect-square'
                }`}
              >
                <div
                  className={`w-full h-full overflow-hidden border border-[#0f2a44]/10 ${
                    variant === 'circle' ? 'rounded-full' : 'rounded-md'
                  }`}
                >
                  <img
                    src={src}
                    alt={`Vista ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {variant === 'circle' ? (
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent): void => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    className="absolute top-[5%] right-[5%] p-2 bg-[#f2b705] text-[#0f2a44] rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110 shadow-lg"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent): void => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    className="absolute top-4 right-4 p-2 bg-[#f2b705] text-[#0f2a44] rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110 shadow-lg"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
                {variant === 'square' && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-4 pointer-events-none">
                    <span className="text-[8px] text-white font-black uppercase tracking-tighter shadow-sm">
                      Slot 0{idx + 1}
                    </span>
                  </div>
                )}
              </div>
            )
          )}

          {/* Empty Slots Placeholder (Industrial feel) */}
          {Array.from({ length: maxImages - images.length }).map(
            (_, i): React.ReactElement => (
              <div
                key={`empty-${i}`}
                className={`${
                  variant === 'circle'
                    ? 'w-48 h-48 rounded-full mx-auto'
                    : 'aspect-square rounded-md'
                } border border-dashed border-[#0f2a44]/5 bg-gray-50/30 flex items-center justify-center text-[#0f2a44]/10`}
              >
                <ImageIcon size={16} />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ArchonImageUploader;

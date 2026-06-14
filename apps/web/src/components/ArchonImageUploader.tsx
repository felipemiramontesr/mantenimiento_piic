/* eslint-disable sonarjs/cognitive-complexity */
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, X, UploadCloud } from 'lucide-react';
import ArchonCropModal from './ArchonCropModal';

interface CropQueueItem {
  id: number;
  dataUrl: string;
}

interface ArchonImageUploaderProps {
  compact?: boolean;
  reducedHeight?: boolean;
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  onFileChange?: (files: File[]) => void | Promise<void>;
  title?: string;
  allowedFormats?: string;
  accept?: string;
  variant?: 'square' | 'circle';
  disabled?: boolean;
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
  disabled = false,
  compact = false,
  reducedHeight = false,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [cropQueue, setCropQueue] = useState<CropQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropIdRef = useRef<number>(0);
  const imagesRef = useRef<string[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // maxImages=1 is a "replace" variant — no capacity lock
  const atCapacity = maxImages > 1 && images.length + cropQueue.length >= maxImages;
  const isDisabled = disabled || atCapacity;

  // ⚡ ARCHON LINT COMPLIANT CLASS RESOLUTION
  let containerSpacingClasses = 'flex-col items-center justify-center gap-12 p-24';
  if (compact) {
    containerSpacingClasses = 'flex-row items-center justify-center gap-4 p-3 h-14';
  } else if (reducedHeight) {
    containerSpacingClasses = 'flex-col items-center justify-center gap-2 p-6';
  }

  let iconPaddingClasses = 'p-12';
  if (compact) {
    iconPaddingClasses = 'p-2';
  } else if (reducedHeight) {
    iconPaddingClasses = 'p-3';
  }

  const handleFiles = (files: FileList | File[]): void => {
    let filesArray = Array.from(files).filter((f) => f.type.startsWith('image/'));

    if (maxImages === 1) {
      if (filesArray.length === 0) return;
      filesArray = [filesArray[0]];
      if (onFileChange) {
        const result = onFileChange([filesArray[0]]);
        if (result instanceof Promise) {
          result.catch((): void => undefined);
        }
      }
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>): void => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          cropIdRef.current += 1;
          const id = cropIdRef.current;
          setCropQueue([{ id, dataUrl }]);
        }
      };
      reader.readAsDataURL(filesArray[0]);
    } else {
      const available = maxImages - images.length - cropQueue.length;
      const toProcess = filesArray.slice(0, Math.max(0, available));
      if (onFileChange && toProcess.length > 0) {
        const result = onFileChange(toProcess);
        if (result instanceof Promise) {
          result.catch((): void => undefined);
        }
      }
      toProcess.forEach((file): void => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>): void => {
          const dataUrl = e.target?.result as string;
          if (dataUrl) {
            cropIdRef.current += 1;
            const id = cropIdRef.current;
            setCropQueue((prev) => [...prev, { id, dataUrl }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropConfirm = (croppedUrl: string): void => {
    const { current } = imagesRef;
    onChange(maxImages === 1 ? [croppedUrl] : [...current, croppedUrl]);
    setCropQueue((prev) => prev.slice(1));
  };

  const handleCropCancel = (): void => {
    setCropQueue((prev) => prev.slice(1));
  };

  const removeImage = (index: number): void => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
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

  return (
    <>
      {cropQueue[0] && (
        <ArchonCropModal
          key={cropQueue[0].id}
          imageSrc={cropQueue[0].dataUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        {/* Drag & Drop Zone */}
        <div
          onDragOver={isDisabled ? undefined : onDragOver}
          onDragLeave={isDisabled ? undefined : onDragLeave}
          onDrop={isDisabled ? undefined : onDrop}
          onClick={isDisabled ? undefined : (): void => fileInputRef.current?.click()}
          className={`
          relative border-2 border-dashed rounded-[4px] transition-all duration-300
          ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          flex ${containerSpacingClasses} group
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
            disabled={isDisabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />

          <div
            className={`
          rounded-[4px] transition-transform duration-500
          ${iconPaddingClasses}
          ${
            isDragging
              ? 'bg-[#f2b705] text-[#0f2a44] scale-110'
              : 'bg-[#0f2a44]/5 text-[#0f2a44]/40 group-hover:scale-110'
          }
        `}
          >
            <UploadCloud size={compact ? 16 : 24} />
          </div>

          <div className={compact ? 'flex items-center gap-2' : 'text-center'}>
            <p className="text-[#0f2a44] font-bold text-archon-lg">
              {isDragging ? '¡Suelta para capturar!' : title}
            </p>
            {!compact && (
              <p
                className={`text-archon-base uppercase tracking-widest opacity-40 ${
                  reducedHeight ? 'mt-1' : 'mt-4'
                }`}
              >
                {atCapacity
                  ? `Máximo ${maxImages} fotos alcanzado`
                  : `Máximo ${maxImages} fotos • ${allowedFormats}`}
              </p>
            )}
          </div>
        </div>

        {/* Preview Grid */}
        {images.length > 0 && (
          <div className={`grid grid-cols-4 ${compact ? 'gap-2' : 'gap-12'}`}>
            {images.map(
              (src, idx): React.ReactElement => (
                <div
                  key={idx}
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
                        removeImage(idx);
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
              )
            )}

            {/* Empty slots — dashed fill to reinforce grid capacity */}
            {Array.from({ length: maxImages - images.length }).map(
              (_, i): React.ReactElement => (
                <div
                  key={`empty-${i}`}
                  className={`${
                    variant === 'circle' ? 'w-48 h-48 mx-auto' : 'aspect-square'
                  } rounded-[4px] border border-dashed border-[#0f2a44]/5 bg-gray-50/30 flex items-center justify-center text-[#0f2a44]/10`}
                >
                  <ImageIcon size={16} />
                </div>
              )
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ArchonImageUploader;

import React, { useState, useRef, useEffect } from 'react';
import ArchonCropModal from './ArchonCropModal';
import { ImagePreviewGrid } from './ArchonImageUploader/ImagePreviewGrid';
import {
  DropzoneTrigger,
  type DropzoneVisualState,
  type DropzoneHandlers,
} from './ArchonImageUploader/DropzoneTrigger';

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

/** Lee un File como data URL y entrega el resultado (FC163 F1B-2, split Alfa 219_AN). */
function readFileAsDataUrl(file: File, onLoaded: (dataUrl: string) => void): void {
  const reader = new FileReader();
  reader.onload = (e: ProgressEvent<FileReader>): void => {
    const dataUrl = e.target?.result as string;
    if (dataUrl) onLoaded(dataUrl);
  };
  reader.readAsDataURL(file);
}

/** Notifica onFileChange (soporta retorno async) sin dejar promesas colgadas (FC163 F1B-2, split Alfa 219_AN). */
function notifyFileChange(
  onFileChange: ((files: File[]) => void | Promise<void>) | undefined,
  files: File[]
): void {
  if (!onFileChange || files.length === 0) return;
  const result = onFileChange(files);
  if (result instanceof Promise) {
    result.catch((): void => undefined);
  }
}

/** className del contenedor según modo compact/reducedHeight (FC163 F1B-2, split Alfa 219_AN). */
function getContainerSpacingClasses(compact: boolean, reducedHeight: boolean): string {
  if (compact) return 'flex-row items-center justify-center gap-4 p-3 h-14';
  if (reducedHeight) return 'flex-col items-center justify-center gap-2 p-6';
  return 'flex-col items-center justify-center gap-12 p-24';
}

/** className del padding del ícono según modo compact/reducedHeight (FC163 F1B-2, split Alfa 219_AN). */
function getIconPaddingClasses(compact: boolean, reducedHeight: boolean): string {
  if (compact) return 'p-2';
  if (reducedHeight) return 'p-3';
  return 'p-12';
}

interface ProcessFilesArgs {
  maxImages: number;
  images: string[];
  cropQueue: CropQueueItem[];
  onFileChange: ((files: File[]) => void | Promise<void>) | undefined;
  cropIdRef: React.MutableRefObject<number>;
  setCropQueue: React.Dispatch<React.SetStateAction<CropQueueItem[]>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

/** Filtra, notifica y encola para recorte los archivos seleccionados (FC163 F1B-2, split Alfa 219_AN — sub-split de useImageUploaderState). */
function processSelectedFiles(files: FileList | File[], args: ProcessFilesArgs): void {
  const { maxImages, images, cropQueue, onFileChange, cropIdRef, setCropQueue, fileInputRef } =
    args;
  const filesArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
  if (maxImages === 1) {
    if (filesArray.length === 0) return;
    const [file] = filesArray;
    notifyFileChange(onFileChange, [file]);
    readFileAsDataUrl(file, (dataUrl) => {
      cropIdRef.current += 1;
      setCropQueue([{ id: cropIdRef.current, dataUrl }]);
    });
  } else {
    const available = maxImages - images.length - cropQueue.length;
    const toProcess = filesArray.slice(0, Math.max(0, available));
    notifyFileChange(onFileChange, toProcess);
    toProcess.forEach((file): void => {
      readFileAsDataUrl(file, (dataUrl) => {
        cropIdRef.current += 1;
        setCropQueue((prev) => [...prev, { id: cropIdRef.current, dataUrl }]);
      });
    });
  }
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
}

interface UseImageUploaderStateArgs {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages: number;
  onFileChange?: (files: File[]) => void | Promise<void>;
}

interface UseImageUploaderStateResult {
  cropQueue: CropQueueItem[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  atCapacity: boolean;
  handleFiles: (files: FileList | File[]) => void;
  handleCropConfirm: (croppedUrl: string) => void;
  handleCropCancel: () => void;
  removeImage: (index: number) => void;
}

/** Estado y handlers de carga/recorte/eliminación de imágenes (FC163 F1B-2, split Alfa 219_AN). */
function useImageUploaderState({
  images,
  onChange,
  maxImages,
  onFileChange,
}: UseImageUploaderStateArgs): UseImageUploaderStateResult {
  const [cropQueue, setCropQueue] = useState<CropQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropIdRef = useRef<number>(0);
  const imagesRef = useRef<string[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // maxImages=1 is a "replace" variant — no capacity lock
  const atCapacity = maxImages > 1 && images.length + cropQueue.length >= maxImages;

  const handleFiles = (files: FileList | File[]): void =>
    processSelectedFiles(files, {
      maxImages,
      images,
      cropQueue,
      onFileChange,
      cropIdRef,
      setCropQueue,
      fileInputRef,
    });

  const handleCropConfirm = (croppedUrl: string): void => {
    const { current } = imagesRef;
    onChange(maxImages === 1 ? [croppedUrl] : [...current, croppedUrl]);
    setCropQueue((prev) => prev.slice(1));
  };

  const handleCropCancel = (): void => setCropQueue((prev) => prev.slice(1));

  const removeImage = (index: number): void => {
    onChange(images.filter((_, i) => i !== index));
  };

  return {
    cropQueue,
    fileInputRef,
    atCapacity,
    handleFiles,
    handleCropConfirm,
    handleCropCancel,
    removeImage,
  };
}

interface UseDragHandlersResult {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

/** Estado y handlers de drag-and-drop de archivos (FC163 F1B-2, split Alfa 219_AN). */
function useDragHandlers(onDropFiles: (files: FileList) => void): UseDragHandlersResult {
  const [isDragging, setIsDragging] = useState<boolean>(false);

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
    if (e.dataTransfer.files) onDropFiles(e.dataTransfer.files);
  };

  return { isDragging, onDragOver, onDragLeave, onDrop };
}

/** Construye el estado visual de la dropzone (FC163 F1B-2, split Alfa 219_AN). */
function buildDropzoneVisual(
  isDisabled: boolean,
  isDragging: boolean,
  compact: boolean,
  reducedHeight: boolean
): DropzoneVisualState {
  return {
    isDisabled,
    isDragging,
    containerSpacingClasses: getContainerSpacingClasses(compact, reducedHeight),
    iconPaddingClasses: getIconPaddingClasses(compact, reducedHeight),
  };
}

interface CropModalGateProps {
  item?: CropQueueItem;
  onConfirm: (url: string) => void;
  onCancel: () => void;
}

/** Construye el bundle de handlers de la dropzone (FC163 F1B-2, split Alfa 219_AN — sub-split del orquestador). */
function buildDropzoneHandlers(
  fileInputRef: React.RefObject<HTMLInputElement>,
  dragHandlers: Omit<UseDragHandlersResult, 'isDragging'>,
  onFilesSelected: (files: FileList) => void
): DropzoneHandlers {
  return {
    ...dragHandlers,
    onOpenFileDialog: (): void => fileInputRef.current?.click(),
    onFilesSelected,
  };
}

/** Renderiza el modal de recorte solo si hay un ítem pendiente en la cola (FC163 F1B-2, split Alfa 219_AN). */
function CropModalGate({ item, onConfirm, onCancel }: CropModalGateProps): React.ReactNode {
  if (!item) return null;
  return (
    <ArchonCropModal
      key={item.id}
      imageSrc={item.dataUrl}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

interface ImageUploaderViewProps {
  cropItem?: CropQueueItem;
  onCropConfirm: (url: string) => void;
  onCropCancel: () => void;
  compact: boolean;
  isDisabled: boolean;
  isDragging: boolean;
  reducedHeight: boolean;
  title: string;
  atCapacity: boolean;
  maxImages: number;
  allowedFormats: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  accept: string;
  dragHandlers: Omit<UseDragHandlersResult, 'isDragging'>;
  onFilesSelected: (files: FileList) => void;
  images: string[];
  variant: 'square' | 'circle';
  disabled: boolean;
  onRemoveImage: (idx: number) => void;
}

/** Ensambla la vista completa (modal de recorte + dropzone + grilla) (FC163 F1B-2, split Alfa 219_AN — sub-split del orquestador). */
function ImageUploaderView({
  cropItem,
  onCropConfirm,
  onCropCancel,
  compact,
  isDisabled,
  isDragging,
  reducedHeight,
  title,
  atCapacity,
  maxImages,
  allowedFormats,
  fileInputRef,
  accept,
  dragHandlers,
  onFilesSelected,
  images,
  variant,
  disabled,
  onRemoveImage,
}: ImageUploaderViewProps): React.JSX.Element {
  return (
    <>
      <CropModalGate item={cropItem} onConfirm={onCropConfirm} onCancel={onCropCancel} />
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        <DropzoneTrigger
          visual={buildDropzoneVisual(isDisabled, isDragging, compact, reducedHeight)}
          copy={{ compact, title, atCapacity, maxImages, allowedFormats, reducedHeight }}
          handlers={buildDropzoneHandlers(fileInputRef, dragHandlers, onFilesSelected)}
          fileInputRef={fileInputRef}
          accept={accept}
        />
        {images.length > 0 && (
          <ImagePreviewGrid
            images={images}
            maxImages={maxImages}
            compact={compact}
            variant={variant}
            disabled={disabled}
            onRemove={onRemoveImage}
          />
        )}
      </div>
    </>
  );
}

/** Selector de imágenes con drag-and-drop, recorte y grilla de previsualización (FC163 F1B-2, split Alfa 219_AN). */
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
  const {
    cropQueue,
    fileInputRef,
    atCapacity,
    handleFiles,
    handleCropConfirm,
    handleCropCancel,
    removeImage,
  } = useImageUploaderState({ images, onChange, maxImages, onFileChange });
  const { isDragging, onDragOver, onDragLeave, onDrop } = useDragHandlers(handleFiles);
  const isDisabled = disabled || atCapacity;

  return (
    <ImageUploaderView
      cropItem={cropQueue[0]}
      onCropConfirm={handleCropConfirm}
      onCropCancel={handleCropCancel}
      compact={compact}
      isDisabled={isDisabled}
      isDragging={isDragging}
      reducedHeight={reducedHeight}
      title={title}
      atCapacity={atCapacity}
      maxImages={maxImages}
      allowedFormats={allowedFormats}
      fileInputRef={fileInputRef}
      accept={accept}
      dragHandlers={{ onDragOver, onDragLeave, onDrop }}
      onFilesSelected={handleFiles}
      images={images}
      variant={variant}
      disabled={disabled}
      onRemoveImage={removeImage}
    />
  );
};

export default ArchonImageUploader;

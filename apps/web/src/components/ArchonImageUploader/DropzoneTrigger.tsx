import React from 'react';
import { UploadCloud } from 'lucide-react';

/** className del contenedor de la dropzone (FC163 F1B-2, split Alfa 219_AN — movido a archivo hermano por max-lines:400). */
function dropzoneClassName(
  isDisabled: boolean,
  isDragging: boolean,
  containerSpacingClasses: string
): string {
  const stateClasses = isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';
  const dragClasses = isDragging
    ? 'border-[#f2b705] bg-[#f2b705]/5 shadow-[0_0_20px_rgba(242,183,5,0.1)]'
    : 'border-[#0f2a44]/10 hover:border-[#f2b705]/40 bg-gray-50/50';
  return `relative border-2 border-dashed rounded-[4px] transition-all duration-300 ${stateClasses} flex ${containerSpacingClasses} group ${dragClasses}`;
}

interface DropzoneIconProps {
  compact: boolean;
  isDragging: boolean;
  iconPaddingClasses: string;
}

/** Ícono animado de la dropzone (FC163 F1B-2, split Alfa 219_AN). */
function DropzoneIcon({
  compact,
  isDragging,
  iconPaddingClasses,
}: DropzoneIconProps): React.JSX.Element {
  const bgClasses = isDragging
    ? 'bg-[#f2b705] text-[#0f2a44] scale-110'
    : 'bg-[#0f2a44]/5 text-[#0f2a44]/40 group-hover:scale-110';
  return (
    <div
      className={`rounded-[4px] transition-transform duration-500 ${iconPaddingClasses} ${bgClasses}`}
    >
      <UploadCloud size={compact ? 16 : 24} />
    </div>
  );
}

interface DropzoneCaptionProps {
  compact: boolean;
  isDragging: boolean;
  title: string;
  atCapacity: boolean;
  maxImages: number;
  allowedFormats: string;
  reducedHeight: boolean;
}

/** Texto/estado de la dropzone (FC163 F1B-2, split Alfa 219_AN). */
function DropzoneCaption({
  compact,
  isDragging,
  title,
  atCapacity,
  maxImages,
  allowedFormats,
  reducedHeight,
}: DropzoneCaptionProps): React.JSX.Element {
  return (
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
  );
}

export interface DropzoneVisualState {
  isDisabled: boolean;
  isDragging: boolean;
  containerSpacingClasses: string;
  iconPaddingClasses: string;
}

export interface DropzoneCopy {
  compact: boolean;
  title: string;
  atCapacity: boolean;
  maxImages: number;
  allowedFormats: string;
  reducedHeight: boolean;
}

export interface DropzoneHandlers {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onOpenFileDialog: () => void;
  onFilesSelected: (files: FileList) => void;
}

interface DropzoneFileInputProps {
  multiple: boolean;
  accept: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  disabled: boolean;
  onFilesSelected: (files: FileList) => void;
}

/** Input de archivo oculto de la dropzone (FC163 F1B-2, split Alfa 219_AN — sub-split de DropzoneTrigger). */
function DropzoneFileInput({
  multiple,
  accept,
  fileInputRef,
  disabled,
  onFilesSelected,
}: DropzoneFileInputProps): React.JSX.Element {
  return (
    <input
      type="file"
      multiple={multiple}
      accept={accept}
      className="hidden"
      ref={fileInputRef}
      disabled={disabled}
      onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
        if (e.target.files) onFilesSelected(e.target.files);
      }}
    />
  );
}

export interface DropzoneTriggerProps {
  visual: DropzoneVisualState;
  copy: DropzoneCopy;
  handlers: DropzoneHandlers;
  fileInputRef: React.RefObject<HTMLInputElement>;
  accept: string;
}

/** Zona de drag & drop + input de archivo (FC163 F1B-2, split Alfa 219_AN — movido a archivo hermano por max-lines:400). */
export function DropzoneTrigger({
  visual,
  copy,
  handlers,
  fileInputRef,
  accept,
}: DropzoneTriggerProps): React.JSX.Element {
  const { isDisabled, isDragging, containerSpacingClasses, iconPaddingClasses } = visual;
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlers.onOpenFileDialog();
    }
  };

  return (
    <div
      onDragOver={isDisabled ? undefined : handlers.onDragOver}
      onDragLeave={isDisabled ? undefined : handlers.onDragLeave}
      onDrop={isDisabled ? undefined : handlers.onDrop}
      onClick={isDisabled ? undefined : handlers.onOpenFileDialog}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      className={dropzoneClassName(isDisabled, isDragging, containerSpacingClasses)}
    >
      <DropzoneFileInput
        multiple={copy.maxImages > 1}
        accept={accept}
        fileInputRef={fileInputRef}
        disabled={isDisabled}
        onFilesSelected={handlers.onFilesSelected}
      />
      <DropzoneIcon
        compact={copy.compact}
        isDragging={isDragging}
        iconPaddingClasses={iconPaddingClasses}
      />
      <DropzoneCaption
        compact={copy.compact}
        isDragging={isDragging}
        title={copy.title}
        atCapacity={copy.atCapacity}
        maxImages={copy.maxImages}
        allowedFormats={copy.allowedFormats}
        reducedHeight={copy.reducedHeight}
      />
    </div>
  );
}

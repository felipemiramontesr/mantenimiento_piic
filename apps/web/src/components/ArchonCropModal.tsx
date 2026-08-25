import React from 'react';
import ArchonModal from './UI/ArchonModal';
import { CropModalHeader } from './ArchonCropModal/CropModalHeader';
import { CropViewport } from './ArchonCropModal/CropViewport';
import { ZoomAndConfirmBar } from './ArchonCropModal/ZoomAndConfirmBar';
import { useCropModalState } from './ArchonCropModal/useCropModalState';

export interface ArchonCropModalProps {
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

/** Modal de encuadre de foto — arrastrar/rueda con mouse, flechas/+/- con teclado. */
const ArchonCropModal: React.FC<ArchonCropModalProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const {
    imgRef,
    containerRef,
    scale,
    offset,
    naturalSize,
    onImageLoad,
    onMouseDown,
    onViewportKeyDown,
    handleZoomIn,
    handleZoomOut,
    handleConfirm,
  } = useCropModalState(onConfirm);

  return (
    <ArchonModal
      isOpen={true}
      onClose={onCancel}
      ariaLabel="Encuadrar foto"
      containerClassName="bg-white rounded-[4px] p-6 flex flex-col gap-4 shadow-2xl w-auto"
    >
      <div data-testid="archon-crop-modal" className="flex flex-col gap-4">
        <CropModalHeader onCancel={onCancel} />

        <p className="text-[11px] text-slate-400 -mt-2">
          Arrastra para encuadrar · rueda del ratón para zoom · flechas y +/- con teclado
        </p>

        <CropViewport
          containerRef={containerRef}
          imgRef={imgRef}
          imageSrc={imageSrc}
          offset={offset}
          scale={scale}
          naturalSize={naturalSize}
          onMouseDown={onMouseDown}
          onImageLoad={onImageLoad}
          onKeyDown={onViewportKeyDown}
        />

        <ZoomAndConfirmBar
          onZoomOut={handleZoomOut}
          onZoomIn={handleZoomIn}
          onConfirm={handleConfirm}
        />
      </div>
    </ArchonModal>
  );
};

export default ArchonCropModal;

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ArchonGalleryOverlayProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  assetId: string;
}

/** Botón de cierre del overlay de galería (FC163 F2B4 Sub-Batch 4B-1). */
function GalleryCloseButton({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      className="fixed top-12 right-12 z-[10000] p-3 rounded-[4px] bg-pinnacle-yellow/40 text-pinnacle-navy hover:bg-pinnacle-yellow/60 transition-colors border border-white/20"
      onClick={onClose}
    >
      <X size={24} />
    </button>
  );
}

interface GalleryNavControlsProps {
  onPrev: () => void;
  onNext: () => void;
}

/** Flechas de navegación prev/next sobre la imagen (FC163 F2B4 Sub-Batch 4B-1). */
function GalleryNavControls({ onPrev, onNext }: GalleryNavControlsProps): React.JSX.Element {
  return (
    <>
      <button
        type="button"
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-[4px] bg-pinnacle-yellow/40 text-pinnacle-navy hover:bg-pinnacle-yellow/60 transition-colors border border-white/10"
        onClick={onPrev}
      >
        <ChevronLeft size={24} />
      </button>
      <button
        type="button"
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-[4px] bg-pinnacle-yellow/40 text-pinnacle-navy hover:bg-pinnacle-yellow/60 transition-colors border border-white/10"
        onClick={onNext}
      >
        <ChevronRight size={24} />
      </button>
    </>
  );
}

interface GalleryFooterProps {
  assetId: string;
  imageCount: number;
  currentIndex: number;
}

/** Pie con nombre del asset + indicadores de posición (FC163 F2B4 Sub-Batch 4B-1). */
function GalleryFooter({
  assetId,
  imageCount,
  currentIndex,
}: GalleryFooterProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-white font-black text-xs uppercase tracking-[0.3em]">{assetId}</span>
      <div className="flex items-center gap-2">
        {Array.from({ length: imageCount }, (_, idx) => (
          <div
            key={idx}
            className={`w-1.5 h-1.5 rounded-[4px] transition-all duration-300 ${
              currentIndex === idx ? 'bg-pinnacle-yellow w-6' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

interface GalleryLightboxContentProps {
  images: string[];
  currentIndex: number;
  assetId: string;
  onPrev: () => void;
  onNext: () => void;
}

/** Contenido central del lightbox: imagen activa + navegación + pie (FC163 F2B4 Sub-Batch 4B-1). */
function GalleryLightboxContent({
  images,
  currentIndex,
  assetId,
  onPrev,
  onNext,
}: GalleryLightboxContentProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center gap-6"
      onClick={(e: React.MouseEvent): void => e.stopPropagation()}
    >
      <div className="relative overflow-hidden rounded-[4px] shadow-2xl border border-white/10 bg-black/20">
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          src={images[currentIndex]}
          alt={`${assetId} - ${currentIndex + 1}`}
          className="max-w-full max-h-[70vh] object-contain"
        />
        {images.length > 1 && <GalleryNavControls onPrev={onPrev} onNext={onNext} />}
      </div>

      <GalleryFooter assetId={assetId} imageCount={images.length} currentIndex={currentIndex} />
    </motion.div>
  );
}

/**
 * 🔱 Archon Component: ArchonGalleryOverlay
 * Implementation: PIIC Sovereign Visualizer (v.18.9.7.0)
 * Aesthetic: Glassmorphic In-Panel Lightbox
 */
const ArchonGalleryOverlay: React.FC<ArchonGalleryOverlayProps> = ({
  images,
  initialIndex = 0,
  onClose,
  assetId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  if (images.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-pinnacle-navy/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <GalleryCloseButton onClose={onClose} />

        <GalleryLightboxContent
          images={images}
          currentIndex={currentIndex}
          assetId={assetId}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ArchonGalleryOverlay;

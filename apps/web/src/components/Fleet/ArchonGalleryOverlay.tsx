import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ArchonGalleryOverlayProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  assetId: string;
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  if (images.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0f2a44]/80 backdrop-blur-xl"
        onClick={onClose}
      >
        {/* Close Button */}
        <button
          className="fixed top-12 right-12 z-[10000] p-3 rounded-[4px] bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/20"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        {/* Gallery Content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative max-w-[90vw] max-h-[80vh] flex flex-col items-center gap-6"
          onClick={(e: React.MouseEvent): void => e.stopPropagation()}
        >
          {/* Main Image Container */}
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

            {/* Navigation Controls (If multiple) */}
            {images.length > 1 && (
              <>
                <button
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-[4px] bg-black/40 text-white hover:bg-black/60 transition-colors border border-white/10"
                  onClick={handlePrev}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-[4px] bg-black/40 text-white hover:bg-black/60 transition-colors border border-white/10"
                  onClick={handleNext}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Footer Info */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-white font-black text-xs uppercase tracking-[0.3em]">
              {assetId}
            </span>
            <div className="flex items-center gap-2">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-[4px] transition-all duration-300 ${
                    currentIndex === idx ? 'bg-[#f2b705] w-6' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ArchonGalleryOverlay;

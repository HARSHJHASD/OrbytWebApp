import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ImageGalleryViewerProps {
  visible: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
}

export default function ImageGalleryViewer({
  visible,
  onClose,
  images,
  initialIndex = 0,
}: ImageGalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [visible, initialIndex]);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!visible) return;
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    if (!visible) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, currentIndex]);

  if (!visible || !images || images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Main Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors backdrop-blur-md border border-white/10"
          title="Close (Esc)"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Counter Badge */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-sm font-semibold">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Navigation Buttons */}
        <div className="absolute bottom-8 right-8 flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-2 rounded-full backdrop-blur-md border border-white/10 transition-all ${
              currentIndex === 0
                ? 'bg-black/20 text-white/30 cursor-not-allowed'
                : 'bg-black/40 hover:bg-black/60 text-white hover:scale-110'
            }`}
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === images.length - 1}
            className={`p-2 rounded-full backdrop-blur-md border border-white/10 transition-all ${
              currentIndex === images.length - 1
                ? 'bg-black/20 text-white/30 cursor-not-allowed'
                : 'bg-black/40 hover:bg-black/60 text-white hover:scale-110'
            }`}
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

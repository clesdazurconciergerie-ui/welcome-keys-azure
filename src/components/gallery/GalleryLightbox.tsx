import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryItem } from "./GalleryEditor";

interface GalleryLightboxProps {
  items: GalleryItem[];
  initialId: string | null;
  onClose: () => void;
}

export default function GalleryLightbox({
  items,
  initialId,
  onClose,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCaption, setShowCaption] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (initialId) {
      const index = items.findIndex((item) => item.id === initialId);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [initialId, items]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  }, [items.length]);

  // Swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, handlePrevious, handleNext]);

  if (!initialId) return null;

  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  const progress = ((currentIndex + 1) / items.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "radial-gradient(60% 60% at 50% 50%, rgba(7, 21, 82, 0.15), rgba(0, 0, 0, 0.85))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)"
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photo"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Close button - glass style */}
      <button
        className="absolute top-4 right-4 z-20 p-3 rounded-2xl text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 8px 24px rgba(7, 21, 82, 0.2)",
          outlineColor: "#071552"
        }}
        onClick={onClose}
        aria-label="Fermer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter - glass style */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-white text-sm font-medium"
        style={{
          background: "rgba(7, 21, 82, 0.5)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 4px 16px rgba(7, 21, 82, 0.3)"
        }}
      >
        {currentIndex + 1} / {items.length}
      </div>

      {/* Caption toggle */}
      {currentItem.caption && (
        <button
          className="absolute top-4 left-4 z-20 p-3 rounded-2xl text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            background: showCaption ? "rgba(7, 21, 82, 0.6)" : "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 8px 24px rgba(7, 21, 82, 0.2)",
            outlineColor: "#071552"
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowCaption(!showCaption);
          }}
          aria-label={showCaption ? "Masquer la légende" : "Afficher la légende"}
        >
          <Info className="w-5 h-5" />
        </button>
      )}

      {/* Navigation arrows - glass style */}
      {items.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 motion-reduce:hover:transform-none"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 8px 24px rgba(7, 21, 82, 0.2)",
              outlineColor: "#071552"
            }}
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
            aria-label="Photo précédente"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-2xl text-white transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 motion-reduce:hover:transform-none"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 8px 24px rgba(7, 21, 82, 0.2)",
              outlineColor: "#071552"
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Photo suivante"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}

      {/* Image container */}
      <div
        className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentItem.url}
          alt={currentItem.alt || currentItem.caption || "Photo"}
          className="max-w-full max-h-[75vh] object-contain rounded-2xl"
          style={{
            boxShadow: "0 25px 60px rgba(7, 21, 82, 0.4)"
          }}
          loading="eager"
        />

        {/* Caption - glass style */}
        {currentItem.caption && showCaption && (
          <div
            className="text-white text-center text-sm max-w-2xl px-6 py-3 rounded-2xl transition-all duration-300"
            style={{
              background: "rgba(7, 21, 82, 0.5)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 8px 24px rgba(7, 21, 82, 0.3)"
            }}
          >
            {currentItem.caption}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 z-20"
        style={{
          background: "rgba(255, 255, 255, 0.2)"
        }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: "#071552",
            boxShadow: "0 0 12px rgba(7, 21, 82, 0.6)"
          }}
        />
      </div>
    </div>
  );
}

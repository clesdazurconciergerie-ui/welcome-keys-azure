import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryItem } from "./GalleryEditor";
import GalleryLightbox from "./GalleryLightbox";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryViewProps {
  items: GalleryItem[];
  enabled: boolean;
}

export default function GalleryView({ items, enabled }: GalleryViewProps) {
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!enabled || items.length === 0) return null;

  // Sort: cover first (order -1), then by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  const checkScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });

    // Update button states after scroll animation
    setTimeout(checkScrollButtons, 350);
  };

  return (
    <Card className="overflow-hidden border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Images className="w-5 h-5 text-primary" />
          Galerie photo
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({sortedItems.length} photo{sortedItems.length > 1 ? "s" : ""})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-4">
        <div className="relative group">
          {/* Left Navigation Arrow */}
          <button
            onClick={() => scroll("left")}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg",
              "flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-all duration-200",
              "hover:bg-white hover:scale-110",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-0 disabled:cursor-not-allowed",
              !canScrollLeft && "!opacity-0 pointer-events-none"
            )}
            aria-label="Photos précédentes"
            disabled={!canScrollLeft}
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>

          {/* Right Navigation Arrow */}
          <button
            onClick={() => scroll("right")}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg",
              "flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-all duration-200",
              "hover:bg-white hover:scale-110",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-0 disabled:cursor-not-allowed",
              !canScrollRight && "!opacity-0 pointer-events-none"
            )}
            aria-label="Photos suivantes"
            disabled={!canScrollRight}
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>

          {/* Horizontal Scrollable Gallery */}
          <div
            ref={scrollContainerRef}
            onScroll={checkScrollButtons}
            className={cn(
              "flex gap-3 overflow-x-auto px-4 pb-2",
              "scroll-smooth snap-x snap-mandatory",
              "scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]",
              "[&::-webkit-scrollbar]:hidden"
            )}
          >
            {sortedItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setLightboxId(item.id)}
                className={cn(
                  "group/item relative flex-shrink-0 snap-start",
                  "overflow-hidden rounded-xl",
                  "shadow-md hover:shadow-xl",
                  "transition-all duration-300 ease-out",
                  "hover:scale-[1.02] hover:-translate-y-0.5",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  // Responsive sizing: 1 visible on mobile, 3-4 on desktop
                  "w-[85vw] sm:w-[45vw] md:w-[32vw] lg:w-[24vw] xl:w-[280px]"
                )}
                style={{ aspectRatio: "4 / 3" }}
                aria-label={item.alt || item.caption || `Photo ${index + 1} - Voir en grand`}
              >
                {/* Image */}
                <img
                  src={item.url}
                  alt={item.alt || item.caption || "Photo du logement"}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />

                {/* Cover Badge */}
                {item.id === "cover" && (
                  <span className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow-md">
                    Couverture
                  </span>
                )}

                {/* Photo Number Indicator */}
                <span className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                  {index + 1}/{sortedItems.length}
                </span>

                {/* Caption (on hover) */}
                {item.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {item.caption}
                    </p>
                  </div>
                )}

                {/* Zoom Icon on Hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <svg
                      className="w-5 h-5 text-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Scroll Hint (mobile) */}
          {sortedItems.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3 px-4 md:hidden">
              {sortedItems.slice(0, Math.min(5, sortedItems.length)).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30"
                />
              ))}
              {sortedItems.length > 5 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{sortedItems.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <GalleryLightbox
          items={sortedItems}
          initialId={lightboxId}
          onClose={() => setLightboxId(null)}
        />
      </CardContent>
    </Card>
  );
}

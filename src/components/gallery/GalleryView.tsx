import { useState } from "react";
import { GalleryItem } from "./GalleryEditor";
import GalleryLightbox from "./GalleryLightbox";

interface GalleryViewProps {
  items: GalleryItem[];
  enabled: boolean;
}

export default function GalleryView({ items, enabled }: GalleryViewProps) {
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  if (!enabled || items.length === 0) return null;

  // Sort: cover first (order -1), then by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  return (
    <>
      <section id="galerie" className="mx-auto max-w-6xl px-6 lg:px-10 py-10">
        <div
          className="rounded-3xl p-6 lg:p-8 border transition-all duration-300"
          style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "rgba(7, 21, 82, 0.12)",
            boxShadow: "0 20px 45px rgba(7, 21, 82, 0.08)"
          }}
        >
          {/* Header with accent line */}
          <div className="mb-6">
            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900">
              Galerie photo
            </h2>
            <div
              className="h-[3px] w-16 mt-2 rounded-full"
              style={{ backgroundColor: "#071552" }}
            />
          </div>

          {/* Grid */}
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {sortedItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setLightboxId(item.id)}
                  className="group relative w-full overflow-hidden rounded-2xl ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-[3px] hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:transform-none"
                  style={{
                    boxShadow: "0 8px 24px rgba(7, 21, 82, 0.10)",
                    aspectRatio: "1 / 1"
                  }}
                  onMouseEnter={(e) => {
                    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                      e.currentTarget.style.boxShadow = "0 12px 32px rgba(7, 21, 82, 0.18), 0 0 0 1px rgba(7, 21, 82, 0.12)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(7, 21, 82, 0.10)";
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outlineColor = "#071552";
                  }}
                  aria-label={item.alt || item.caption || "Voir la photo en grand"}
                >
                  {/* Glass reflection overlay */}
                  <span
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background: "linear-gradient(120deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%)"
                    }}
                  />

                  {/* Image */}
                  <img
                    src={item.url}
                    alt={item.alt || item.caption || "Photo du logement"}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />

                  {/* Cover badge */}
                  {item.id === 'cover' && (
                    <span
                      className="absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white z-20"
                      style={{ backgroundColor: "#071552" }}
                    >
                      Couverture
                    </span>
                  )}

                  {/* Caption overlay */}
                  {item.caption && (
                    <span
                      className="absolute bottom-2 left-2 right-2 text-white text-xs px-2 py-1 rounded-lg z-20 line-clamp-2"
                      style={{
                        background: "rgba(0, 0, 0, 0.45)",
                        backdropFilter: "blur(6px)",
                        WebkitBackdropFilter: "blur(6px)"
                      }}
                    >
                      {item.caption}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <GalleryLightbox
        items={sortedItems}
        initialId={lightboxId}
        onClose={() => setLightboxId(null)}
      />
    </>
  );
}

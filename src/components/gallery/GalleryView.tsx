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
      <section id="galerie" className="space-y-4">
        <h2 className="text-2xl font-bold">Galerie photo</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedItems.map((item) => (
            <button
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-muted hover:scale-[1.02] transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-[#071552] focus:ring-offset-2"
              onClick={() => setLightboxId(item.id)}
              aria-label={item.alt || item.caption || "Voir la photo"}
            >
              <img
                src={item.url}
                alt={item.alt || item.caption || "Photo du logement"}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </button>
          ))}
        </div>

        {sortedItems.some((item) => item.caption) && (
          <div className="space-y-2 text-sm text-muted-foreground">
            {sortedItems
              .filter((item) => item.caption)
              .map((item) => (
                <p key={item.id}>
                  <strong>Photo {sortedItems.indexOf(item) + 1}:</strong> {item.caption}
                </p>
              ))}
          </div>
        )}
      </section>

      <GalleryLightbox
        items={sortedItems}
        initialId={lightboxId}
        onClose={() => setLightboxId(null)}
      />
    </>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Galerie photo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setLightboxId(item.id)}
              className="group relative overflow-hidden rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{ aspectRatio: "1 / 1" }}
              aria-label={item.alt || item.caption || "Voir la photo en grand"}
            >
              <img
                src={item.url}
                alt={item.alt || item.caption || "Photo du logement"}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              
              {item.id === 'cover' && (
                <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded">
                  Couverture
                </span>
              )}
              
              {item.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 line-clamp-2">
                  {item.caption}
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </button>
          ))}
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

// MODULE — Bande de médias (photos ménage / photos EDL) avec support vidéo futur
import { StorageImage } from "@/components/StorageImage";

export interface StripMedia {
  id: string;
  url: string;
  media_type?: string | null;
  captured_at?: string | null;
  caption?: string | null;
}

export function ZoneMediaStrip({ media, empty }: { media: StripMedia[]; empty?: string }) {
  if (media.length === 0) {
    return empty ? <p className="text-xs text-muted-foreground">{empty}</p> : null;
  }
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {media.map((m) => (
        <figure key={m.id} className="shrink-0 w-28 border border-border">
          {m.media_type === "video" ? (
            <video src={m.url} controls className="w-28 h-28 object-cover bg-muted" />
          ) : (
            <StorageImage src={m.url} alt={m.caption ?? "Média"} className="w-28 h-28 object-cover bg-muted" loading="lazy" />
          )}
          <figcaption className="text-[10px] px-1 py-1 text-muted-foreground truncate">
            {m.captured_at
              ? new Date(m.captured_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
              : m.caption ?? ""}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

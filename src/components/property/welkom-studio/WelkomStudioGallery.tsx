import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  Download,
  Trash2,
  Maximize2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  GitCompare,
  Sliders,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PropertyPhotoStudio } from "@/hooks/useWelkomStudio";
import { WelkomStudioBeforeAfter } from "./WelkomStudioBeforeAfter";

interface Props {
  photos: PropertyPhotoStudio[];
  onDelete: (id: string) => void;
  onEdit: (photo: PropertyPhotoStudio) => void;
}

export function WelkomStudioGallery({ photos, onDelete, onEdit }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [compareIdx, setCompareIdx] = useState<number | null>(null);

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const downloadOne = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const downloadSelection = async () => {
    for (const id of selected) {
      const p = photos.find((x) => x.id === id);
      if (!p) continue;
      await downloadOne(p.full_url, `welkom-studio-${p.id.slice(0, 8)}.jpg`);
    }
  };

  const deleteSelection = async () => {
    for (const id of selected) await onDelete(id);
    setSelected(new Set());
  };

  const lightboxPhoto = useMemo(
    () => (lightboxIdx !== null ? photos[lightboxIdx] : null),
    [lightboxIdx, photos]
  );
  const comparePhoto = useMemo(
    () => (compareIdx !== null ? photos[compareIdx] : null),
    [compareIdx, photos]
  );

  if (photos.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
        <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-base font-semibold text-foreground">
          Aucune photo dans Welkom Studio
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Importez vos premières expositions pour générer une photo HDR.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-accent/30 bg-background/95 backdrop-blur shadow-md">
          <span className="text-sm font-medium text-foreground">
            {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={downloadSelection}>
              <Download className="w-4 h-4 mr-1.5" /> Télécharger
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteSelection}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((p, idx) => {
          const isSel = selected.has(p.id);
          return (
            <Card
              key={p.id}
              className={`group/card relative overflow-hidden transition-all duration-200 ${
                isSel ? "ring-2 ring-accent" : "hover:shadow-lg"
              }`}
            >
              <div className="relative aspect-video bg-muted">
                <img
                  src={p.thumb_url || p.full_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Top badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <Checkbox
                    checked={isSel}
                    onCheckedChange={() => toggleSelect(p.id)}
                    className="bg-background/90 border-border"
                  />
                  {p.is_hdr ? (
                    <Badge className="bg-accent text-primary text-[10px] font-bold border-none">
                      <Sparkles className="w-3 h-3 mr-1" />
                      HDR
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-background/90 text-[10px]">
                      Import
                    </Badge>
                  )}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/70 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setLightboxIdx(idx)}
                    title="Agrandir"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => onEdit(p)}
                    title="Ré-éditer"
                  >
                    <Sliders className="w-4 h-4" />
                  </Button>
                  {p.is_hdr && p.original_urls.length > 0 && (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => setCompareIdx(idx)}
                      title="Avant / Après"
                    >
                      <GitCompare className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() =>
                      downloadOne(p.full_url, `welkom-studio-${p.id.slice(0, 8)}.jpg`)
                    }
                    title="Télécharger"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => onDelete(p.id)}
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                </span>
                {p.processing_time_ms != null && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {(p.processing_time_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxPhoto !== null} onOpenChange={(o) => !o && setLightboxIdx(null)}>
        <DialogContent className="max-w-6xl w-[95vw] p-0 bg-background/95 backdrop-blur-md border-border">
          <DialogTitle className="sr-only">Aperçu photo</DialogTitle>
          {lightboxPhoto && (
            <div className="relative">
              <img
                src={lightboxPhoto.full_url}
                alt=""
                className="w-full max-h-[85vh] object-contain"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-3 right-3"
                onClick={() => setLightboxIdx(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              {lightboxIdx !== null && lightboxIdx > 0 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1/2 left-3 -translate-y-1/2"
                  onClick={() => setLightboxIdx((i) => (i! > 0 ? i! - 1 : i))}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              {lightboxIdx !== null && lightboxIdx < photos.length - 1 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1/2 right-3 -translate-y-1/2"
                  onClick={() => setLightboxIdx((i) => (i! < photos.length - 1 ? i! + 1 : i))}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              )}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-background/90 backdrop-blur border border-border">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(lightboxPhoto.created_at), "d MMM yyyy", { locale: fr })}
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    downloadOne(
                      lightboxPhoto.full_url,
                      `welkom-studio-${lightboxPhoto.id.slice(0, 8)}.jpg`
                    )
                  }
                  className="bg-accent text-primary hover:bg-accent/90"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Télécharger
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Before/After dialog */}
      <Dialog open={comparePhoto !== null} onOpenChange={(o) => !o && setCompareIdx(null)}>
        <DialogContent className="max-w-5xl w-[95vw] p-4 sm:p-6">
          <DialogTitle className="text-base">Comparaison avant / après Welkom Studio</DialogTitle>
          {comparePhoto && comparePhoto.original_urls[0] && (
            <WelkomStudioBeforeAfter
              beforeUrl={comparePhoto.original_urls[0]}
              afterUrl={comparePhoto.full_url}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

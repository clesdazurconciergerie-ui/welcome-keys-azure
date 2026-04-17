import { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { applyManualFilters, type ManualFilters } from "@/lib/welkom-studio-engine";
import { Loader2, RotateCcw, Save } from "lucide-react";
import type { PropertyPhotoStudio } from "@/hooks/useWelkomStudio";

interface Props {
  photo: PropertyPhotoStudio | null;
  onClose: () => void;
  onSave: (photoId: string, sourceUrl: string, filters: ManualFilters) => Promise<void>;
}

const DEFAULT_FILTERS: ManualFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 10,
  sharpness: 30,
  warmth: 0,
};

export function WelkomStudioEditor({ photo, onClose, onSave }: Props) {
  const [filters, setFilters] = useState<ManualFilters>(DEFAULT_FILTERS);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const sourceDataRef = useRef<ImageData | null>(null);

  // Load source image into hidden cache when photo changes
  useEffect(() => {
    if (!photo) return;
    setFilters(DEFAULT_FILTERS);
    sourceDataRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Downscale preview source for fluid sliders
      const max = 800;
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      sourceDataRef.current = ctx.getImageData(0, 0, w, h);
      drawPreview(DEFAULT_FILTERS);
    };
    img.src = photo.thumb_url || photo.full_url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?.id]);

  const drawPreview = (f: ManualFilters) => {
    const src = sourceDataRef.current;
    const canvas = previewRef.current;
    if (!src || !canvas) return;
    canvas.width = src.width;
    canvas.height = src.height;
    const out = applyManualFilters(src, f);
    canvas.getContext("2d")!.putImageData(out, 0, 0);
  };

  useEffect(() => {
    if (sourceDataRef.current) drawPreview(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const set = (k: keyof ManualFilters, v: number) =>
    setFilters((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!photo) return;
    setSaving(true);
    await onSave(photo.id, photo.full_url, filters);
    setSaving(false);
    onClose();
  };

  const sliders = useMemo(
    () => [
      { key: "brightness" as const, label: "Luminosité", min: -100, max: 100 },
      { key: "contrast" as const, label: "Contraste", min: -100, max: 100 },
      { key: "saturation" as const, label: "Saturation", min: -100, max: 100 },
      { key: "sharpness" as const, label: "Netteté", min: 0, max: 100 },
      { key: "warmth" as const, label: "Chaud / Froid", min: -100, max: 100 },
    ],
    []
  );

  return (
    <Sheet open={!!photo} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ré-éditer la photo</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-video">
            <canvas ref={previewRef} className="w-full h-full object-contain" />
          </div>

          <div className="space-y-4">
            {sliders.map((s) => (
              <div key={s.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">{s.label}</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {filters[s.key] > 0 ? `+${filters[s.key]}` : filters[s.key]}
                  </span>
                </div>
                <Slider
                  min={s.min}
                  max={s.max}
                  step={1}
                  value={[filters[s.key]]}
                  onValueChange={(v) => set(s.key, v[0])}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Réinitialiser
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-accent text-primary hover:bg-accent/90 font-semibold"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Appliquer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

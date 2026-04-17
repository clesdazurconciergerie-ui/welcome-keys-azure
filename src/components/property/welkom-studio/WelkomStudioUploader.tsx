import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Layers, Plus, Info, X } from "lucide-react";
import { analyzeExposure, type Exposure } from "@/lib/welkom-studio-engine";

interface PreviewItem {
  file: File;
  url: string;
  exposure?: Exposure;
  meanLuminance?: number;
}

const EXPOSURE_META: Record<Exposure, { label: string; cls: string }> = {
  under: { label: "Sous-exposée", cls: "bg-primary/15 text-primary border-primary/30" },
  normal: { label: "Normale", cls: "bg-muted text-foreground border-border" },
  over: { label: "Surexposée", cls: "bg-accent/15 text-accent border-accent/30" },
};

interface Props {
  onProcessHDR: (files: File[]) => void;
  onUploadSingle: (file: File) => void;
  disabled?: boolean;
}

export function WelkomStudioUploader({ onProcessHDR, onUploadSingle, disabled }: Props) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const singleRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), [items]);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const incoming: PreviewItem[] = Array.from(files).map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));
    setItems((prev) => [...prev, ...incoming]);

    // Analyze exposure async per file
    incoming.forEach(async (it) => {
      try {
        const info = await analyzeExposure(it.file);
        setItems((prev) =>
          prev.map((p) =>
            p.url === it.url
              ? { ...p, exposure: info.label, meanLuminance: info.meanLuminance }
              : p
          )
        );
      } catch {
        // ignore
      }
    });
  };

  const removeItem = (url: string) => {
    setItems((prev) => {
      const found = prev.find((p) => p.url === url);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.url !== url);
    });
  };

  const handleHDR = () => {
    if (items.length === 0) return;
    onProcessHDR(items.map((i) => i.file));
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Alert className="border-accent/30 bg-accent/5">
        <Info className="h-4 w-4 text-accent" />
        <AlertTitle className="text-foreground">Comment obtenir un rendu HDR optimal ?</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Photographiez la même pièce 3 fois : sous-exposée (-2 EV), normale (0 EV), surexposée
          (+2 EV). Welkom Studio fusionne automatiquement les expositions et applique tone mapping,
          balance des blancs et clarté.
        </AlertDescription>
      </Alert>

      <Card className="border-2 border-dashed border-border hover:border-accent/50 transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Camera className="w-7 h-7 text-accent" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                Glissez vos photos ou sélectionnez-les
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, WebP — recommandé : 3 expositions de la même pièce
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <Button
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Sélectionner des photos
              </Button>
              <Button
                variant="outline"
                onClick={() => singleRef.current?.click()}
                disabled={disabled}
              >
                Importer photo seule
              </Button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={singleRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadSingle(f);
              if (singleRef.current) singleRef.current.value = "";
            }}
          />
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {items.length} photo{items.length > 1 ? "s" : ""} sélectionnée
                {items.length > 1 ? "s" : ""}
              </p>
              <Button
                onClick={handleHDR}
                disabled={disabled}
                className="bg-accent text-primary hover:bg-accent/90 font-semibold"
              >
                <Layers className="w-4 h-4 mr-1.5" />
                {items.length === 1 ? "Optimiser cette photo" : "Fusionner en HDR"}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((it) => (
                <div
                  key={it.url}
                  className="relative rounded-xl overflow-hidden border border-border group/item bg-muted"
                >
                  <div className="aspect-video">
                    <img src={it.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  {it.exposure && (
                    <Badge
                      variant="outline"
                      className={`absolute top-2 left-2 text-[10px] ${EXPOSURE_META[it.exposure].cls}`}
                    >
                      {EXPOSURE_META[it.exposure].label}
                    </Badge>
                  )}
                  <button
                    onClick={() => removeItem(it.url)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

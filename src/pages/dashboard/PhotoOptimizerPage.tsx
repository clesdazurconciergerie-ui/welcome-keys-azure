import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Upload, Sparkles, Download, X, CheckCircle2,
  Sun, Palette, Trash2, Camera, Image as ImageIcon,
  Wand2, RotateCcw, Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────
interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploaded" | "analyzing" | "analyzed" | "generating" | "optimized" | "error";
  analysis?: PhotoAnalysis;
  optimizedUrl?: string;
  error?: string;
}

interface PhotoAnalysis {
  roomType: string;
  lightingQuality: string;
  composition: string;
  issues: string[];
  colorImprovements: string[];
  realismCorrections: string[];
  stagingSuggestions: string[];
  overallScore: number;
}

type PhotoStyle = "standard" | "luxury" | "minimal" | "coastal";
type PhotoIntensity = "light" | "balanced" | "strong";

const STYLES: { value: PhotoStyle; label: string; icon: React.ReactNode }[] = [
  { value: "standard", label: "Standard", icon: <Camera className="h-3.5 w-3.5" /> },
  { value: "luxury", label: "Luxe", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: "minimal", label: "Minimal", icon: <Sun className="h-3.5 w-3.5" /> },
  { value: "coastal", label: "Côtier", icon: <Palette className="h-3.5 w-3.5" /> },
];

const INTENSITIES: { value: PhotoIntensity; label: string }[] = [
  { value: "light", label: "Léger" },
  { value: "balanced", label: "Équilibré" },
  { value: "strong", label: "Fort" },
];

// ── Segmented Control ──────────────────────────────────
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const handleChange = useCallback((v: string) => onChange(v as T), [onChange]);
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl bg-muted/60 p-1 backdrop-blur-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
            value === opt.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Premium Loader ─────────────────────────────────────
function PremiumLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
        <Wand2 className="absolute inset-0 m-auto h-4 w-4 text-primary animate-pulse" />
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function PhotoOptimizerPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [style, setStyle] = useState<PhotoStyle>("standard");
  const [intensity, setIntensity] = useState<PhotoIntensity>("balanced");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "optimized">("original");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ───────────────────────────────────────
  const addPhotos = useCallback((files: FileList | File[]) => {
    const newPhotos: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploaded" as const,
      }));
    if (newPhotos.length === 0) {
      toast.error("Aucune image valide sélectionnée");
      return;
    }
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (!selectedPhoto && newPhotos.length > 0) setSelectedPhoto(newPhotos[0].id);
  }, [selectedPhoto]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addPhotos(e.dataTransfer.files);
  }, [addPhotos]);

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
    if (selectedPhoto === id) setPhotos((curr) => {
      setSelectedPhoto(curr.find((p) => p.id !== id)?.id ?? null);
      return curr;
    });
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const analyzePhoto = async (id: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "analyzing" } : p)));
    try {
      const photo = photos.find((p) => p.id === id)!;
      const base64 = await fileToBase64(photo.file);
      const { data, error } = await supabase.functions.invoke("photo-optimizer-analyze", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "analyzed", analysis: data.analysis } : p))
      );
    } catch {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "error", error: "Erreur d'analyse" } : p))
      );
      toast.error("Erreur lors de l'analyse");
    }
  };

  const generateOptimized = async (id: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "generating" } : p)));
    try {
      const photo = photos.find((p) => p.id === id)!;
      const base64 = await fileToBase64(photo.file);
      const { data, error } = await supabase.functions.invoke("photo-optimizer-generate", {
        body: { imageBase64: base64, style, intensity, analysis: photo.analysis },
      });
      if (error) throw error;
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "optimized", optimizedUrl: data.optimizedImageUrl } : p))
      );
      setViewMode("optimized");
      toast.success("Photo optimisée !");
    } catch {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "error", error: "Erreur de génération" } : p))
      );
      toast.error("Erreur lors de la génération");
    }
  };

  const downloadPhoto = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `optimized-${name}`;
    a.click();
  };

  const processAll = async () => {
    const toAnalyze = photos.filter((p) => p.status === "uploaded");
    for (const photo of toAnalyze) await analyzePhoto(photo.id);
    const toGenerate = photos.filter((p) => p.status === "analyzed" || p.analysis);
    for (const photo of toGenerate) await generateOptimized(photo.id);
  };

  const selected = photos.find((p) => p.id === selectedPhoto);
  const isProcessing = selected?.status === "analyzing" || selected?.status === "generating";
  const showOptimized = viewMode === "optimized" && selected?.optimizedUrl;

  return (
    <div className="h-full flex flex-col gap-4 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            Photo Optimizer
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5 ml-10">
            Transformez vos photos en visuels haute conversion
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SegmentedControl<PhotoStyle> options={STYLES} value={style} onChange={setStyle} />
          <SegmentedControl<PhotoIntensity> options={INTENSITIES} value={intensity} onChange={setIntensity} />
          {photos.length > 1 && (
            <Button onClick={processAll} size="sm" className="gap-1.5 rounded-lg">
              <Sparkles className="h-3.5 w-3.5" />
              Tout traiter
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* ── Left Filmstrip ── */}
        <div className="w-24 flex-shrink-0 flex flex-col gap-2">
          {/* Upload Thumb */}
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && addPhotos(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground mt-1 font-medium">Ajouter</span>
          </label>

          {/* Photo Thumbnails */}
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => { setSelectedPhoto(photo.id); setViewMode("original"); }}
                className={cn(
                  "group relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
                  "ring-2 ring-offset-1 ring-offset-background",
                  selectedPhoto === photo.id
                    ? "ring-primary shadow-md"
                    : "ring-transparent hover:ring-border"
                )}
              >
                <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
                {/* Status overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {(photo.status === "analyzing" || photo.status === "generating") && (
                    <div className="h-5 w-5 rounded-full border-2 border-t-primary border-muted animate-spin" />
                  )}
                  {photo.status === "optimized" && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 drop-shadow" />
                  )}
                  {photo.status === "error" && (
                    <X className="h-4 w-4 text-destructive drop-shadow" />
                  )}
                </div>
                {/* Remove */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-foreground/60 text-background opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center: Image Canvas ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {selected ? (
            <>
              {/* Image View */}
              <div className="flex-1 relative rounded-2xl overflow-hidden bg-muted/30 min-h-0">
                {isProcessing ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                    <PremiumLoader
                      label={selected.status === "analyzing" ? "Analyse en cours…" : "Génération en cours…"}
                    />
                  </div>
                ) : null}

                {/* Original Image */}
                <img
                  src={showOptimized ? selected.optimizedUrl! : selected.previewUrl}
                  alt=""
                  className="w-full h-full object-contain transition-opacity duration-300"
                  key={showOptimized ? "opt" : "orig"}
                />
              </div>

              {/* Bottom Bar */}
              <div className="flex items-center justify-between pt-3 flex-shrink-0">
                {/* View Toggle */}
                <div>
                  {selected.optimizedUrl && (
                    <SegmentedControl
                      options={[
                        { value: "original" as const, label: "Original" },
                        { value: "optimized" as const, label: "Optimisée" },
                      ]}
                      value={viewMode}
                      onChange={setViewMode}
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {selected.status === "uploaded" && (
                    <Button onClick={() => analyzePhoto(selected.id)} size="sm" className="gap-1.5 rounded-lg">
                      <Wand2 className="h-3.5 w-3.5" /> Analyser
                    </Button>
                  )}
                  {selected.status === "analyzed" && (
                    <Button onClick={() => generateOptimized(selected.id)} size="sm" className="gap-1.5 rounded-lg">
                      <Sparkles className="h-3.5 w-3.5" /> Optimiser
                    </Button>
                  )}
                  {selected.status === "optimized" && selected.optimizedUrl && (
                    <Button
                      onClick={() => downloadPhoto(selected.optimizedUrl!, selected.file.name)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-lg"
                    >
                      <Download className="h-3.5 w-3.5" /> Télécharger
                    </Button>
                  )}
                  {selected.status === "error" && (
                    <Button variant="outline" onClick={() => analyzePhoto(selected.id)} size="sm" className="gap-1.5 rounded-lg">
                      <RotateCcw className="h-3.5 w-3.5" /> Réessayer
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl border-2 border-dashed border-border/50">
              <label
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex flex-col items-center cursor-pointer group"
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && addPhotos(e.target.files)}
                  className="hidden"
                />
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors duration-200">
                  <ImageIcon className="h-7 w-7 text-muted-foreground/50 group-hover:text-primary/60 transition-colors duration-200" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Glissez vos photos ici</p>
                <p className="text-xs text-muted-foreground/60 mt-1">ou cliquez pour sélectionner</p>
              </label>
            </div>
          )}
        </div>

        {/* ── Right: Analysis Panel ── */}
        {selected?.analysis && (
          <div className="w-64 flex-shrink-0 space-y-4 overflow-y-auto">
            <div>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Analyse</h3>
              <div className="space-y-2">
                <AnalysisChip label="Pièce" value={selected.analysis.roomType} />
                <AnalysisChip label="Éclairage" value={selected.analysis.lightingQuality} />
                <AnalysisChip label="Composition" value={selected.analysis.composition} />
              </div>
            </div>

            {selected.analysis.issues.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Problèmes
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.analysis.issues.map((issue, i) => (
                    <Badge key={i} variant="destructive" className="text-[10px] font-normal rounded-md">
                      {issue}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selected.analysis.stagingSuggestions.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Suggestions
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selected.analysis.stagingSuggestions.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-normal rounded-md">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Score */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Score</span>
                <span className="font-semibold text-foreground">{selected.analysis.overallScore}/10</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${selected.analysis.overallScore * 10}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <p className="text-xs font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

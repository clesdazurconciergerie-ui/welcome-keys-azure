import { useState, useCallback, useRef, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Upload, Sparkles, Download, X, CheckCircle2,
  Sun, Palette, Trash2, Camera, Image as ImageIcon,
  Wand2, RotateCcw, GripVertical, Zap,
} from "lucide-react";
import SmartCaptureModal from "@/components/photo-optimizer/SmartCaptureModal";
import type { HDRResult } from "@/lib/hdr-processor";

// Note: 'intensity' and 'analysis' params removed — the new Nodalview-grade
// prompt handles everything in one pass without needing analysis or intensity levels.

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

const STYLES: { value: PhotoStyle; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "standard", label: "Standard", desc: "Pro naturel", icon: <Camera className="h-4 w-4" /> },
  { value: "luxury", label: "Luxe", desc: "Haut de gamme", icon: <Sparkles className="h-4 w-4" /> },
  { value: "minimal", label: "Minimal", desc: "Épuré & clair", icon: <Sun className="h-4 w-4" /> },
  { value: "coastal", label: "Côte d'Azur", desc: "Lumière dorée", icon: <Palette className="h-4 w-4" /> },
];

// ── Before/After Slider ────────────────────────────────
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      updatePosition(clientX);
    };
    const handleUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, [updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-col-resize select-none"
      onMouseDown={(e) => { isDragging.current = true; updatePosition(e.clientX); }}
      onTouchStart={(e) => { isDragging.current = true; updatePosition(e.touches[0].clientX); }}
    >
      {/* After (full) */}
      <img src={after} alt="Optimized" className="absolute inset-0 w-full h-full object-contain" />
      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={before}
          alt="Original"
          className="absolute inset-0 h-full object-contain"
          style={{ width: `${containerRef.current?.offsetWidth ?? 1000}px`, maxWidth: "none" }}
        />
      </div>
      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-0.5 h-full bg-white/90 shadow-lg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {/* Labels */}
      <div className="absolute top-3 left-3 z-10">
        <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wider">
          Avant
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wider">
          Après
        </span>
      </div>
    </div>
  );
}

// ── Premium Loader ─────────────────────────────────────
function PremiumLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
        <div className="absolute inset-0 rounded-full border-2 border-t-primary/40 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
        <Wand2 className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Optimisation éclairage, couleurs et profondeur…</p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function PhotoOptimizerPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [style, setStyle] = useState<PhotoStyle>("luxury");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [homeStaging, setHomeStaging] = useState(false);
  const [smartCaptureOpen, setSmartCaptureOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle HDR capture from SmartCaptureModal
  const handleSmartCapture = useCallback(async (result: HDRResult) => {
    const file = new File([result.blob], `photo-pro-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const photoItem: PhotoItem = {
      id: crypto.randomUUID(),
      file,
      previewUrl: result.dataUrl,
      status: "uploaded",
    };
    setPhotos(prev => [...prev, photoItem]);
    setSelectedPhoto(photoItem.id);
    toast.success("Photo capturée !");
  }, []);

  // One-click pro: capture → auto analyze → auto generate
  const handleOneClickPro = useCallback(async (result: HDRResult) => {
    const file = new File([result.blob], `photo-pro-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const id = crypto.randomUUID();
    const photoItem: PhotoItem = {
      id,
      file,
      previewUrl: result.dataUrl,
      status: "generating",
    };
    setPhotos(prev => [...prev, photoItem]);
    setSelectedPhoto(id);

    try {
      const base64 = result.dataUrl;
      // Send clean photo directly to AI — no local degradation
      const { data: genData, error: genErr } = await supabase.functions.invoke("photo-optimizer-generate", {
        body: { imageBase64: base64, style, homeStaging },
      });
      if (genErr) throw genErr;

      setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: "optimized", optimizedUrl: genData.optimizedImageUrl } : p));
      toast.success("Photo optimisée !");
    } catch {
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: "error", error: "Erreur de traitement" } : p));
      toast.error("Erreur lors du traitement");
    }
  }, [style, homeStaging]);

  const addPhotos = useCallback((files: FileList | File[]) => {
    const newPhotos: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploaded" as const,
      }));
    if (newPhotos.length === 0) { toast.error("Aucune image valide"); return; }
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
      const { data, error } = await supabase.functions.invoke("photo-optimizer-analyze", { body: { imageBase64: base64 } });
      if (error) throw error;
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "analyzed", analysis: data.analysis } : p)));
    } catch {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", error: "Erreur d'analyse" } : p)));
      toast.error("Erreur lors de l'analyse");
    }
  };

  const generateOptimized = async (id: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "generating" } : p)));
    try {
      const photo = photos.find((p) => p.id === id)!;
      const base64 = await fileToBase64(photo.file);
      const { data, error } = await supabase.functions.invoke("photo-optimizer-generate", {
        body: { imageBase64: base64, style, homeStaging },
      });
      if (error) throw error;
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "optimized", optimizedUrl: data.optimizedImageUrl } : p)));
      toast.success("Photo optimisée !");
    } catch {
      setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, status: "error", error: "Erreur de génération" } : p)));
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
    const toProcess = photos.filter((p) => p.status === "uploaded");
    for (const photo of toProcess) {
      await generateOptimized(photo.id);
    }
  };

  const selected = photos.find((p) => p.id === selectedPhoto);
  const isProcessing = selected?.status === "analyzing" || selected?.status === "generating";

  // ── Empty State (No Photos) ──
  if (photos.length === 0) {
    return (
      <>
        <SmartCaptureModal
          open={smartCaptureOpen}
          onClose={() => setSmartCaptureOpen(false)}
          onCapture={handleOneClickPro}
        />
        <div className="h-full flex flex-col items-center justify-center p-8 gap-8">
          {/* Pro Capture CTA */}
          <button
            onClick={() => setSmartCaptureOpen(true)}
            className="flex flex-col items-center justify-center w-full max-w-2xl py-12 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 cursor-pointer group transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <Zap className="h-9 w-9 text-primary/60 group-hover:text-primary transition-colors duration-300" />
            </div>
            <p className="text-lg font-bold text-foreground">
              Prendre une photo pro
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
              Capture HDR intelligente — Fusion multi-exposition + optimisation IA automatique
            </p>
            <div className="mt-5">
              <span className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md group-hover:shadow-lg transition-all duration-300">
                Ouvrir la caméra
              </span>
            </div>
          </button>

          {/* Classic upload */}
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="relative flex flex-col items-center justify-center w-full max-w-2xl py-8 rounded-2xl border-2 border-dashed border-border/60 cursor-pointer group transition-all duration-300 hover:border-primary/40"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && addPhotos(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground/70">
                  Ou importez vos photos existantes
                </p>
                <p className="text-xs text-muted-foreground">
                  Glissez-déposez ou cliquez pour sélectionner
                </p>
              </div>
            </div>
          </label>
        </div>
      </>
    );
  }

  // ── Main Layout ──
  return (
    <div className="h-full flex flex-col">
      <SmartCaptureModal
        open={smartCaptureOpen}
        onClose={() => setSmartCaptureOpen(false)}
        onCapture={handleOneClickPro}
      />

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-1 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">Photo Optimizer</h1>
            <p className="text-xs text-muted-foreground">
              {photos.length} photo{photos.length > 1 ? "s" : ""} · {photos.filter(p => p.status === "optimized").length} optimisée{photos.filter(p => p.status === "optimized").length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSmartCaptureOpen(true)} variant="outline" size="sm" className="gap-2 rounded-xl">
            <Zap className="h-3.5 w-3.5" /> Photo Pro
          </Button>
          {photos.length > 1 && (
            <Button onClick={processAll} size="sm" className="gap-2 rounded-xl shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Tout traiter
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* ── Left: Filmstrip + Controls ── */}
        <div className="w-[200px] flex-shrink-0 flex flex-col gap-4 min-h-0">
          {/* Style Selector */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Style</span>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl p-2.5 text-center transition-all duration-200",
                    style === s.value
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30 shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  {s.icon}
                  <span className="text-[10px] font-semibold leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          </div>

          {/* Home Staging Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Home Staging</span>
              <Switch checked={homeStaging} onCheckedChange={setHomeStaging} />
            </div>
            {homeStaging && (
              <p className="text-[9px] text-muted-foreground leading-relaxed animate-fade-in">
                Ajoute des éléments lifestyle subtils (petit-déjeuner, décor, ambiance) pour améliorer la projection
              </p>
            )}
          </div>
          </div>

          {/* Thumbnails */}
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none min-h-0">
            <label
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center justify-center h-12 rounded-xl border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && addPhotos(e.target.files)}
                className="hidden"
              />
              <Upload className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
              <span className="text-[10px] text-muted-foreground font-medium">Ajouter</span>
            </label>

            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setSelectedPhoto(photo.id)}
                className={cn(
                  "group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
                  "ring-2 ring-offset-2 ring-offset-background",
                  selectedPhoto === photo.id
                    ? "ring-primary shadow-md"
                    : "ring-transparent hover:ring-border/50"
                )}
              >
                <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
                {/* Status */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {(photo.status === "analyzing" || photo.status === "generating") && (
                    <div className="h-6 w-6 rounded-full border-2 border-t-primary border-primary/20 animate-spin" />
                  )}
                  {photo.status === "optimized" && (
                    <div className="h-5 w-5 rounded-full bg-green-500/90 flex items-center justify-center shadow">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {photo.status === "error" && (
                    <div className="h-5 w-5 rounded-full bg-destructive/90 flex items-center justify-center shadow">
                      <X className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                {/* Remove */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Analysis Panel (if available) */}
          {selected?.analysis && (
            <div className="flex-shrink-0 space-y-2 border-t border-border/40 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Analyse</span>
                <span className="text-xs font-bold text-primary">{selected.analysis.overallScore}/10</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${selected.analysis.overallScore * 10}%` }}
                />
              </div>
              <div className="space-y-1">
                <MiniChip label={selected.analysis.roomType} />
                <MiniChip label={selected.analysis.lightingQuality} />
              </div>
              {selected.analysis.issues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.analysis.issues.slice(0, 3).map((issue, i) => (
                    <Badge key={i} variant="destructive" className="text-[9px] font-normal rounded-md px-1.5 py-0">
                      {issue}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Center: Image Canvas ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {selected ? (
            <>
              {/* Canvas */}
              <div className="flex-1 relative rounded-2xl overflow-hidden min-h-0 bg-gradient-to-br from-muted/20 to-muted/40 shadow-inner">
                {/* Processing overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-md">
                    <PremiumLoader
                      label={selected.status === "analyzing" ? "Analyse en cours…" : "Génération de l'image optimisée…"}
                    />
                  </div>
                )}

                {/* Before/After Slider or Single Image */}
                {selected.optimizedUrl ? (
                  <BeforeAfterSlider before={selected.previewUrl} after={selected.optimizedUrl} />
                ) : (
                  <img
                    src={selected.previewUrl}
                    alt=""
                    className="w-full h-full object-contain transition-opacity duration-300"
                  />
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 flex-shrink-0">
                <div className="text-xs text-muted-foreground">
                  {selected.optimizedUrl && (
                    <span className="flex items-center gap-1.5">
                      <GripVertical className="h-3 w-3" />
                      Glissez le curseur pour comparer
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selected.status === "uploaded" && (
                    <Button onClick={() => analyzePhoto(selected.id)} size="sm" className="gap-2 rounded-xl shadow-sm">
                      <Wand2 className="h-3.5 w-3.5" /> Analyser
                    </Button>
                  )}
                  {selected.status === "analyzed" && (
                    <Button onClick={() => generateOptimized(selected.id)} size="sm" className="gap-2 rounded-xl shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" /> Optimiser
                    </Button>
                  )}
                  {selected.status === "optimized" && selected.optimizedUrl && (
                    <>
                      <Button onClick={() => generateOptimized(selected.id)} variant="outline" size="sm" className="gap-2 rounded-xl">
                        <RotateCcw className="h-3.5 w-3.5" /> Regénérer
                      </Button>
                      <Button
                        onClick={() => downloadPhoto(selected.optimizedUrl!, selected.file.name)}
                        size="sm"
                        className="gap-2 rounded-xl shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5" /> Télécharger
                      </Button>
                    </>
                  )}
                  {selected.status === "error" && (
                    <Button variant="outline" onClick={() => analyzePhoto(selected.id)} size="sm" className="gap-2 rounded-xl">
                      <RotateCcw className="h-3.5 w-3.5" /> Réessayer
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Sélectionnez une photo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniChip({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
      <span className="text-[10px] font-medium text-foreground">{label}</span>
    </div>
  );
}

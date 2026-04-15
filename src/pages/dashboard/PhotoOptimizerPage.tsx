import { useState, useCallback, useRef, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Upload, Sparkles, Download, X, CheckCircle2,
  Sun, Palette, Trash2, Camera,
  RotateCcw, GripVertical, Zap, Wand2,
} from "lucide-react";
import SmartCaptureModal from "@/components/photo-optimizer/SmartCaptureModal";
import {
  processPhoto,
  processSingleImage,
  createCanvasFromSource,
  type ProcessedResult,
  type ProcessingProgress,
} from "@/lib/photo-engine";

// -- Types --
interface PhotoItem {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl?: string;
  optimizedUrl?: string; // AI-enhanced (server-side)
  status: "processing" | "processed" | "enhancing" | "enhanced" | "error";
  progress?: ProcessingProgress;
  error?: string;
  processingTimeMs?: number;
}

type PhotoStyle = "standard" | "luxury" | "minimal" | "coastal";

const STYLES: { value: PhotoStyle; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "standard", label: "Standard", desc: "Pro naturel", icon: <Camera className="h-4 w-4" /> },
  { value: "luxury", label: "Luxe", desc: "Haut de gamme", icon: <Sparkles className="h-4 w-4" /> },
  { value: "minimal", label: "Minimal", desc: "Épuré & clair", icon: <Sun className="h-4 w-4" /> },
  { value: "coastal", label: "Côte d'Azur", desc: "Lumière dorée", icon: <Palette className="h-4 w-4" /> },
];

// -- Before/After Slider --
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
      <img src={after} alt="Optimized" className="absolute inset-0 w-full h-full object-contain" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={before}
          alt="Original"
          className="absolute inset-0 h-full object-contain"
          style={{ width: `${containerRef.current?.offsetWidth ?? 1000}px`, maxWidth: "none" }}
        />
      </div>
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-0.5 h-full bg-white/90 shadow-lg" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
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

// -- Processing Overlay --
function ProcessingOverlay({ progress }: { progress?: ProcessingProgress }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
          <Wand2 className="absolute inset-0 m-auto h-5 w-5 text-primary animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {progress?.message || 'Traitement automatique…'}
          </p>
          {progress && (
            <div className="w-48 h-1 bg-muted rounded-full mt-3 mx-auto overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Main Component --
export default function PhotoOptimizerPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [style, setStyle] = useState<PhotoStyle>("luxury");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [homeStaging, setHomeStaging] = useState(false);
  const [smartCaptureOpen, setSmartCaptureOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-process: capture from camera → already processed by photo-engine
  const handleSmartCapture = useCallback((result: ProcessedResult) => {
    const file = new File([result.blob], `photo-pro-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const id = crypto.randomUUID();
    const photoItem: PhotoItem = {
      id,
      file,
      originalUrl: result.dataUrl,
      processedUrl: result.dataUrl,
      status: "processed",
      processingTimeMs: result.processingTimeMs,
    };
    setPhotos(prev => [...prev, photoItem]);
    setSelectedPhoto(id);
    toast.success(`Photo traitée en ${Math.round(result.processingTimeMs)}ms`);
  }, []);

  // Auto-process uploaded files immediately
  const addAndProcessPhotos = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) { toast.error("Aucune image valide"); return; }

    for (const file of imageFiles) {
      const id = crypto.randomUUID();
      const originalUrl = URL.createObjectURL(file);
      
      const photoItem: PhotoItem = {
        id,
        file,
        originalUrl,
        status: "processing",
      };
      
      setPhotos(prev => [...prev, photoItem]);
      if (!selectedPhoto) setSelectedPhoto(id);

      // Auto-process immediately — no button needed
      try {
        const result = await processSingleImage(file, (p) => {
          setPhotos(prev => prev.map(ph => ph.id === id ? { ...ph, progress: p } : ph));
        });
        
        setPhotos(prev => prev.map(ph => ph.id === id ? {
          ...ph,
          processedUrl: result.dataUrl,
          status: "processed" as const,
          processingTimeMs: result.processingTimeMs,
          progress: undefined,
        } : ph));
        
        toast.success(`Photo traitée en ${Math.round(result.processingTimeMs)}ms`);
      } catch {
        setPhotos(prev => prev.map(ph => ph.id === id ? {
          ...ph,
          status: "error" as const,
          error: "Erreur de traitement",
        } : ph));
        toast.error("Erreur de traitement");
      }
    }
  }, [selectedPhoto]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addAndProcessPhotos(e.dataTransfer.files);
  }, [addAndProcessPhotos]);

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const p = prev.find(x => x.id === id);
      if (p) URL.revokeObjectURL(p.originalUrl);
      const remaining = prev.filter(x => x.id !== id);
      if (selectedPhoto === id) {
        setSelectedPhoto(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  // AI enhancement (server-side, optional second pass)
  const enhanceWithAI = async (id: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: "enhancing" } : p));
    try {
      const photo = photos.find(p => p.id === id)!;
      const base64 = photo.processedUrl || photo.originalUrl;
      
      const { data, error } = await supabase.functions.invoke("photo-optimizer-generate", {
        body: { imageBase64: base64, style, homeStaging },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.optimizedImageUrl) throw new Error("Aucune image retournée");
      
      setPhotos(prev => prev.map(p => p.id === id ? {
        ...p,
        status: "enhanced" as const,
        optimizedUrl: data.optimizedImageUrl,
      } : p));
      toast.success("Optimisation IA terminée !");
    } catch (err: any) {
      const msg = err?.message || "Erreur IA";
      setPhotos(prev => prev.map(p => p.id === id ? { ...p, status: "error" as const, error: msg } : p));
      toast.error(msg);
    }
  };

  const downloadPhoto = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `optimized-${name}`;
    a.click();
  };

  const selected = photos.find(p => p.id === selectedPhoto);
  const isProcessing = selected?.status === "processing" || selected?.status === "enhancing";
  const bestUrl = selected?.optimizedUrl || selected?.processedUrl;

  // -- Empty State --
  if (photos.length === 0) {
    return (
      <>
        <SmartCaptureModal
          open={smartCaptureOpen}
          onClose={() => setSmartCaptureOpen(false)}
          onCapture={handleSmartCapture}
        />
        <div className="h-full flex flex-col items-center justify-center p-8 gap-8">
          <button
            onClick={() => setSmartCaptureOpen(true)}
            className="flex flex-col items-center justify-center w-full max-w-2xl py-12 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 cursor-pointer group transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
              <Zap className="h-9 w-9 text-primary/60 group-hover:text-primary transition-colors duration-300" />
            </div>
            <p className="text-lg font-bold text-foreground">Prendre une photo pro</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
              Capture + traitement automatique — résultat professionnel instantané
            </p>
            <div className="mt-5">
              <span className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md group-hover:shadow-lg transition-all duration-300">
                Ouvrir la caméra
              </span>
            </div>
          </button>

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
              onChange={(e) => e.target.files && addAndProcessPhotos(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-foreground/70">Importez vos photos</p>
                <p className="text-xs text-muted-foreground">Traitement automatique à l'import — aucun bouton requis</p>
              </div>
            </div>
          </label>
        </div>
      </>
    );
  }

  // -- Main Layout --
  return (
    <div className="h-full flex flex-col">
      <SmartCaptureModal
        open={smartCaptureOpen}
        onClose={() => setSmartCaptureOpen(false)}
        onCapture={handleSmartCapture}
      />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-1 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">Photo Optimizer</h1>
            <p className="text-xs text-muted-foreground">
              {photos.length} photo{photos.length > 1 ? "s" : ""} · Traitement automatique
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setSmartCaptureOpen(true)} variant="outline" size="sm" className="gap-2 rounded-xl">
            <Zap className="h-3.5 w-3.5" /> Photo Pro
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* Left Sidebar */}
        <div className="w-[200px] flex-shrink-0 flex flex-col gap-4 min-h-0">
          {/* Style Selector */}
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">Style IA</span>
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

          {/* Home Staging Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Home Staging</span>
              <Switch checked={homeStaging} onCheckedChange={setHomeStaging} />
            </div>
            {homeStaging && (
              <p className="text-[9px] text-muted-foreground leading-relaxed animate-fade-in">
                Ajoute des éléments lifestyle subtils
              </p>
            )}
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
                onChange={(e) => e.target.files && addAndProcessPhotos(e.target.files)}
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
                <img src={photo.processedUrl || photo.originalUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  {photo.status === "processing" && (
                    <div className="h-6 w-6 rounded-full border-2 border-t-primary border-primary/20 animate-spin" />
                  )}
                  {photo.status === "enhancing" && (
                    <div className="h-6 w-6 rounded-full border-2 border-t-primary border-primary/20 animate-spin" />
                  )}
                  {(photo.status === "processed" || photo.status === "enhanced") && (
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
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Image Canvas */}
        <div className="flex-1 flex flex-col min-h-0">
          {selected ? (
            <>
              <div className="flex-1 relative rounded-2xl overflow-hidden min-h-0 bg-gradient-to-br from-muted/20 to-muted/40 shadow-inner">
                {isProcessing && <ProcessingOverlay progress={selected.progress} />}

                {selected.processedUrl && !isProcessing ? (
                  <BeforeAfterSlider before={selected.originalUrl} after={bestUrl!} />
                ) : !isProcessing ? (
                  <img src={selected.originalUrl} alt="" className="w-full h-full object-contain" />
                ) : null}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-3 flex-shrink-0">
                <div className="text-xs text-muted-foreground">
                  {selected.processedUrl && (
                    <span className="flex items-center gap-1.5">
                      <GripVertical className="h-3 w-3" />
                      Glissez pour comparer avant/après
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selected.processingTimeMs && (
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(selected.processingTimeMs)}ms
                    </span>
                  )}
                  {(selected.status === "processed") && (
                    <Button onClick={() => enhanceWithAI(selected.id)} variant="outline" size="sm" className="gap-2 rounded-xl">
                      <Sparkles className="h-3.5 w-3.5" /> Optimisation IA
                    </Button>
                  )}
                  {bestUrl && (selected.status === "processed" || selected.status === "enhanced") && (
                    <Button
                      onClick={() => downloadPhoto(bestUrl, selected.file.name)}
                      size="sm"
                      className="gap-2 rounded-xl shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" /> Télécharger
                    </Button>
                  )}
                  {selected.status === "error" && (
                    <Button variant="outline" onClick={() => {
                      setPhotos(prev => prev.map(p => p.id === selected.id ? { ...p, status: "processing" as const } : p));
                      processSingleImage(selected.file).then(result => {
                        setPhotos(prev => prev.map(p => p.id === selected.id ? {
                          ...p,
                          processedUrl: result.dataUrl,
                          status: "processed" as const,
                          processingTimeMs: result.processingTimeMs,
                        } : p));
                      }).catch(() => {
                        setPhotos(prev => prev.map(p => p.id === selected.id ? { ...p, status: "error" as const } : p));
                      });
                    }} size="sm" className="gap-2 rounded-xl">
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

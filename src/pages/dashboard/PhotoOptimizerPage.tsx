import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, Image as ImageIcon, Sparkles, Download, Loader2, X, CheckCircle2,
  Sun, Palette, Eye, Trash2, ArrowRight, Camera,
} from "lucide-react";

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

const STYLE_LABELS: Record<PhotoStyle, string> = {
  standard: "Standard",
  luxury: "Luxe",
  minimal: "Minimal",
  coastal: "Côtier / Méditerranéen",
};

const INTENSITY_LABELS: Record<PhotoIntensity, string> = {
  light: "Léger",
  balanced: "Équilibré",
  strong: "Fort (Airbnb optimisé)",
};

export default function PhotoOptimizerPage() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [style, setStyle] = useState<PhotoStyle>("standard");
  const [intensity, setIntensity] = useState<PhotoIntensity>("balanced");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (selectedPhoto === id) setSelectedPhoto(photos.find((p) => p.id !== id)?.id ?? null);
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
    } catch (err: any) {
      console.error("Analysis error:", err);
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "error", error: "Erreur d'analyse" } : p))
      );
      toast.error("Erreur lors de l'analyse de la photo");
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
      toast.success("Photo optimisée avec succès !");
    } catch (err: any) {
      console.error("Generation error:", err);
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
    const toProcess = photos.filter((p) => p.status === "uploaded" || p.status === "analyzed");
    for (const photo of toProcess) {
      if (photo.status === "uploaded") {
        await analyzePhoto(photo.id);
      }
    }
    // After analysis, generate all analyzed
    for (const photo of photos) {
      const current = photos.find((p) => p.id === photo.id);
      if (current && (current.status === "analyzed" || current.analysis)) {
        await generateOptimized(photo.id);
      }
    }
  };

  const selected = photos.find((p) => p.id === selectedPhoto);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          Airbnb Photo Optimizer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Transformez vos photos en images professionnelles haute conversion
        </p>
      </div>

      {/* Settings Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Style :</span>
              <Select value={style} onValueChange={(v) => setStyle(v as PhotoStyle)}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STYLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Intensité :</span>
              <Select value={intensity} onValueChange={(v) => setIntensity(v as PhotoIntensity)}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTENSITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            {photos.length > 1 && (
              <Button onClick={processAll} size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Tout traiter ({photos.filter((p) => p.status === "uploaded" || p.status === "analyzed").length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upload + Grid */}
        <div className="lg:col-span-1 space-y-4">
          {/* Upload */}
          <Card>
            <CardContent className="p-4">
              <label
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && addPhotos(e.target.files)}
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                />
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Glissez vos photos ici</span>
                <span className="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner</span>
              </label>
            </CardContent>
          </Card>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Photos ({photos.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ring-2 transition-all ${
                        selectedPhoto === photo.id ? "ring-primary" : "ring-transparent hover:ring-border"
                      }`}
                    >
                      <img src={photo.previewUrl} alt="" className="w-full h-full object-cover" />
                      {/* Status badge */}
                      <div className="absolute top-1 right-1">
                        {photo.status === "analyzing" || photo.status === "generating" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : photo.status === "optimized" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : photo.status === "error" ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : null}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                        className="absolute top-1 left-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Detail View */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card className="h-full">
              <CardContent className="p-5 space-y-5">
                {/* Before/After */}
                <Tabs defaultValue="original" className="w-full">
                  <TabsList className="mb-3">
                    <TabsTrigger value="original" className="gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Original
                    </TabsTrigger>
                    {selected.optimizedUrl && (
                      <TabsTrigger value="optimized" className="gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Optimisée
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <TabsContent value="original">
                    <div className="rounded-xl overflow-hidden bg-muted aspect-video">
                      <img src={selected.previewUrl} alt="" className="w-full h-full object-contain" />
                    </div>
                  </TabsContent>
                  {selected.optimizedUrl && (
                    <TabsContent value="optimized">
                      <div className="rounded-xl overflow-hidden bg-muted aspect-video">
                        <img src={selected.optimizedUrl} alt="" className="w-full h-full object-contain" />
                      </div>
                    </TabsContent>
                  )}
                </Tabs>

                {/* Analysis */}
                {selected.analysis && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" /> Analyse
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <AnalysisCard label="Pièce" value={selected.analysis.roomType} />
                      <AnalysisCard label="Éclairage" value={selected.analysis.lightingQuality} />
                      <AnalysisCard label="Composition" value={selected.analysis.composition} />
                    </div>
                    {selected.analysis.issues.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Problèmes détectés</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selected.analysis.issues.map((issue, i) => (
                            <Badge key={i} variant="destructive" className="text-xs">{issue}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.analysis.stagingSuggestions.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">Suggestions</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selected.analysis.stagingSuggestions.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {selected.status === "uploaded" && (
                    <Button onClick={() => analyzePhoto(selected.id)} className="gap-2">
                      <Eye className="h-4 w-4" /> Analyser
                    </Button>
                  )}
                  {selected.status === "analyzing" && (
                    <Button disabled className="gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours…
                    </Button>
                  )}
                  {selected.status === "analyzed" && (
                    <Button onClick={() => generateOptimized(selected.id)} className="gap-2">
                      <Sparkles className="h-4 w-4" /> Générer version optimisée
                    </Button>
                  )}
                  {selected.status === "generating" && (
                    <Button disabled className="gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…
                    </Button>
                  )}
                  {selected.status === "optimized" && selected.optimizedUrl && (
                    <Button
                      onClick={() => downloadPhoto(selected.optimizedUrl!, selected.file.name)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" /> Télécharger
                    </Button>
                  )}
                  {selected.status === "error" && (
                    <Button variant="destructive" onClick={() => analyzePhoto(selected.id)} className="gap-2">
                      <ArrowRight className="h-4 w-4" /> Réessayer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Uploadez des photos pour commencer</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AnalysisCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-accent/50 p-3">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

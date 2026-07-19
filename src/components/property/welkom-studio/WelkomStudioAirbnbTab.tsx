import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Sparkles, Download, Save, Loader2, Wand2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  propertyId: string;
}

interface PhotoJob {
  id: string;
  originalUrl: string;
  originalFile: File;
  enhancedUrl: string | null;
  status: "idle" | "processing" | "done" | "error";
  error?: string;
}

const BUCKET = "mission-photos";
const PREFIX = "welkom-studio";

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

async function normalizeToJpeg(file: File): Promise<{ blob: Blob; mime: string }> {
  const name = (file.name || "").toLowerCase();
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  let source: Blob = file;
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    source = Array.isArray(converted) ? converted[0] : converted;
  }

  // Re-encode via canvas to guarantee a supported JPEG (also strips EXIF orientation issues)
  const url = URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Impossible de décoder l'image (format non supporté par le navigateur)"));
      i.src = url;
    });
    const maxSide = 2048;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encodage JPEG échoué"))), "image/jpeg", 0.92)
    );
    return { blob, mime: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const resp = await fetch(dataUrl);
  return resp.blob();
}

const SUPPORTED_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const MAX_SIZE_MB = 20;
const UNSUPPORTED_HELP =
  "Formats acceptés : JPG, PNG, WEBP ou HEIC (iPhone). Ouvre le fichier dans Aperçu (Mac) ou Photos, puis « Exporter » en JPEG, ou renomme l'extension en .jpg.";

function validateFile(file: File): string | null {
  const name = (file.name || "").toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  const type = (file.type || "").toLowerCase();

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum ${MAX_SIZE_MB} Mo — réduis la résolution avant d'envoyer.`;
  }
  const isImageMime = type.startsWith("image/");
  const isKnownExt = SUPPORTED_EXT.includes(ext);
  if (!isImageMime && !isKnownExt) {
    return `Format non supporté (${ext || type || "inconnu"}). ${UNSUPPORTED_HELP}`;
  }
  // Explicitly reject formats OpenAI can't handle and heic2any can't convert
  if (["gif", "bmp", "tiff", "tif", "svg", "avif", "raw", "cr2", "nef", "arw", "dng"].includes(ext)) {
    return `Format ${ext.toUpperCase()} non supporté. ${UNSUPPORTED_HELP}`;
  }
  return null;
}

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("unsupported") || m.includes("non supporté") || m.includes("décoder")) {
    return `Format d'image non supporté. ${UNSUPPORTED_HELP}`;
  }
  if (m.includes("heic")) {
    return `Conversion HEIC échouée. Ouvre la photo dans Aperçu (Mac) puis « Exporter » en JPEG, ou change le format dans Réglages iPhone → Appareil photo → Formats → « Le plus compatible ».`;
  }
  if (m.includes("429") || m.includes("rate")) {
    return "Trop de requêtes en même temps. Réessaie dans quelques secondes.";
  }
  if (m.includes("402") || m.includes("credit")) {
    return "Crédits IA épuisés. Recharge ton workspace pour continuer.";
  }
  return msg;
}

export function WelkomStudioAirbnbTab({ propertyId }: Props) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: File[]) => {
      const accepted: File[] = [];
      const rejected: { name: string; reason: string }[] = [];
      for (const f of files) {
        const err = validateFile(f);
        if (err) rejected.push({ name: f.name, reason: err });
        else accepted.push(f);
      }
      if (rejected.length) {
        toast({
          title: `${rejected.length} fichier(s) refusé(s)`,
          description: rejected.map((r) => `• ${r.name} — ${r.reason}`).join("\n"),
          variant: "destructive",
        });
      }
      if (!accepted.length) return;
      const newJobs: PhotoJob[] = accepted.map((f) => ({
        id: crypto.randomUUID(),
        originalUrl: URL.createObjectURL(f),
        originalFile: f,
        enhancedUrl: null,
        status: "idle",
      }));
      setJobs((prev) => [...newJobs, ...prev]);
    },
    [toast]
  );

  const enhanceOne = useCallback(
    async (job: PhotoJob) => {
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: "processing", error: undefined } : j))
      );
      try {
        const { blob, mime } = await normalizeToJpeg(job.originalFile);
        const dataUrl = await readAsDataUrl(blob);
        const { data, error } = await supabase.functions.invoke("airbnb-photo-enhance", {
          body: { imageBase64: dataUrl, mimeType: mime },
        });

        if (error) throw error;
        const enhanced = (data as any)?.imageDataUrl as string | undefined;
        if (!enhanced) throw new Error("Aucune image retournée par l'IA");
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "done", enhancedUrl: enhanced } : j
          )
        );
      } catch (e: any) {
        const raw = e?.message || String(e);
        const msg = friendlyError(raw);
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: "error", error: msg } : j))
        );
        toast({ title: "Édition impossible", description: msg, variant: "destructive" });
      }
    },
    [toast]
  );


  const enhanceAll = useCallback(async () => {
    setIsBusy(true);
    const pending = jobs.filter((j) => j.status === "idle" || j.status === "error");
    for (const job of pending) {
      await enhanceOne(job);
    }
    setIsBusy(false);
  }, [jobs, enhanceOne]);

  const downloadEnhanced = useCallback(async (job: PhotoJob) => {
    if (!job.enhancedUrl) return;
    const blob = await dataUrlToBlob(job.enhancedUrl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airbnb-${job.originalFile.name.replace(/\.[^.]+$/, "")}.jpg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const saveToGallery = useCallback(
    async (job: PhotoJob) => {
      if (!job.enhancedUrl) return;
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Non authentifié");

        const blob = await dataUrlToBlob(job.enhancedUrl);
        const id = crypto.randomUUID();
        const path = `${PREFIX}/${propertyId}/airbnb_${id}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

        const { error: dbErr } = await supabase.from("property_photos").insert({
          property_id: propertyId,
          user_id: userId,
          url: publicUrl,
          full_url: publicUrl,
          thumb_url: publicUrl,
          original_urls: [],
          is_hdr: false,
          filters_applied: { pipeline: "airbnb-ai-v1" },
          display_order: 0,
        } as any);
        if (dbErr) throw dbErr;

        toast({ title: "Ajouté à la galerie ✨" });
      } catch (e: any) {
        toast({
          title: "Erreur d'ajout à la galerie",
          description: e?.message || String(e),
          variant: "destructive",
        });
      }
    },
    [propertyId, toast]
  );

  const clearAll = useCallback(() => {
    jobs.forEach((j) => URL.revokeObjectURL(j.originalUrl));
    setJobs([]);
  }, [jobs]);

  const pendingCount = jobs.filter((j) => j.status === "idle" || j.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <Card
        className="p-8 border-2 border-dashed cursor-pointer hover:border-accent transition"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            f.type.startsWith("image/")
          );
          if (files.length) addFiles(files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ opacity: 0, position: "absolute", pointerEvents: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) addFiles(files);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <div className="text-center space-y-2">
          <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Déposez vos photos brutes ici
          </p>
          <p className="text-xs text-muted-foreground">
            L'IA les transforme en photos prêtes pour Airbnb (3:2, cadrage magazine).
          </p>
        </div>
      </Card>

      {/* Actions */}
      {jobs.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{jobs.length} photo{jobs.length > 1 ? "s" : ""}</Badge>
            {pendingCount > 0 && (
              <Badge className="bg-accent text-primary">{pendingCount} en attente</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={isBusy}>
              Vider
            </Button>
            <Button
              onClick={enhanceAll}
              disabled={isBusy || pendingCount === 0}
              className="gap-2"
            >
              {isBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Traiter tout ({pendingCount})
            </Button>
          </div>
        </div>
      )}

      {/* Grille de résultats */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <Card key={job.id} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="relative bg-muted aspect-[3/2]">
                  <img
                    src={job.originalUrl}
                    alt="Avant"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-background/90 px-2 py-0.5 border border-border">
                    Avant
                  </span>
                </div>
                <div className="relative bg-muted aspect-[3/2] flex items-center justify-center">
                  {job.enhancedUrl ? (
                    <>
                      <img
                        src={job.enhancedUrl}
                        alt="Après"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-bold uppercase bg-accent text-primary px-2 py-0.5">
                        Après ✨
                      </span>
                    </>
                  ) : job.status === "processing" ? (
                    <div className="text-center text-muted-foreground text-xs space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      <p>Édition IA en cours…</p>
                    </div>
                  ) : job.status === "error" ? (
                    <div className="text-center text-destructive text-xs px-3">
                      {job.error || "Erreur"}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs">
                      En attente
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 flex items-center justify-between gap-2">
                <p className="text-xs truncate text-muted-foreground flex-1">
                  {job.originalFile.name}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {(job.status === "idle" || job.status === "error") && (
                    <Button size="sm" variant="outline" onClick={() => enhanceOne(job)}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {job.status === "done" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enhanceOne(job)}
                        title="Refaire"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadEnhanced(job)}
                        title="Télécharger"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveToGallery(job)}
                        title="Ajouter à la galerie"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

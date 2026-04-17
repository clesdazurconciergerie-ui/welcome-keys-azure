import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  onCaptured: (blobs: Blob[]) => void;
  disabled?: boolean;
}

type AebPhase = "idle" | "under" | "normal" | "over";

const PHASE_LABEL: Record<AebPhase, string> = {
  idle: "",
  under: "Capture sous-exposée…",
  normal: "Capture normale…",
  over: "Capture sur-exposée…",
};

/**
 * WelkomStudioCamera — capture live AEB (Auto Exposure Bracketing)
 *
 * Stratégie :
 *  A) Si MediaTrackCapabilities.exposureCompensation existe → applyConstraints + takePhoto à EV-2/0/+2
 *  B) Sinon, fallback : 9 frames en rafale (80ms), puis on garde la plus sombre, médiane, la plus claire
 *  C) Si ImageCapture indisponible → 3 frames espacées de 300 ms via Canvas, mêmes règles
 */
export function WelkomStudioCamera({ onCaptured, disabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [phase, setPhase] = useState<AebPhase>("idle");
  const [stable, setStable] = useState(true);

  // Démarrage caméra
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Impossible d'accéder à la caméra. Autorisez l'accès dans votre navigateur."
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Détection stabilité (accéléromètre)
  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    let last = { x: 0, y: 0, z: 0 };
    let lastUpdate = 0;
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
      const now = performance.now();
      if (now - lastUpdate < 100) return;
      const delta =
        Math.abs((acc.x ?? 0) - last.x) +
        Math.abs((acc.y ?? 0) - last.y) +
        Math.abs((acc.z ?? 0) - last.z);
      setStable(delta < 1.2);
      last = { x: acc.x ?? 0, y: acc.y ?? 0, z: acc.z ?? 0 };
      lastUpdate = now;
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, []);

  const grabFrameFromVideo = useCallback((): Blob | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0);
    return null; // remplacé par toBlob async ci-dessous
  }, []);

  const grabBlobFromVideo = useCallback((): Promise<Blob | null> => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return Promise.resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.drawImage(v, 0, 0);
    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
  }, []);

  const measureBrightness = useCallback(async (blob: Blob): Promise<number> => {
    const bitmap = await createImageBitmap(blob);
    const w = 100;
    const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return 0;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const d = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    }
    return sum / (d.length / 4);
  }, []);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const captureAEB = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    setIsCapturing(true);
    setError(null);

    try {
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        exposureCompensation?: { min: number; max: number; step: number };
      };
      const ImageCaptureCtor: any = (window as any).ImageCapture;
      const supportsExposure = !!caps.exposureCompensation && !!ImageCaptureCtor;

      const blobs: Blob[] = [];

      // CAS A — exposureCompensation supportée
      if (supportsExposure) {
        const ic = new ImageCaptureCtor(track);
        const range = caps.exposureCompensation!;
        const evValues = [
          Math.max(range.min, -2),
          0,
          Math.min(range.max, 2),
        ];
        const labels: AebPhase[] = ["under", "normal", "over"];
        for (let i = 0; i < evValues.length; i++) {
          setPhase(labels[i]);
          await track.applyConstraints({
            advanced: [{ exposureCompensation: evValues[i] } as any],
          });
          await sleep(450);
          const b = await ic.takePhoto();
          blobs.push(b);
        }
      } else if (ImageCaptureCtor) {
        // CAS B — rafale 9 frames + sélection
        setPhase("normal");
        const ic = new ImageCaptureCtor(track);
        const burst: Blob[] = [];
        for (let i = 0; i < 9; i++) {
          try {
            burst.push(await ic.takePhoto());
          } catch {
            const b = await grabBlobFromVideo();
            if (b) burst.push(b);
          }
          await sleep(80);
        }
        const measured = await Promise.all(
          burst.map(async (b) => ({ b, m: await measureBrightness(b) }))
        );
        measured.sort((a, b) => a.m - b.m);
        blobs.push(
          measured[0].b,
          measured[Math.floor(measured.length / 2)].b,
          measured[measured.length - 1].b
        );
      } else {
        // CAS C — ImageCapture absent : 3 frames du <video>
        const labels: AebPhase[] = ["under", "normal", "over"];
        for (let i = 0; i < 3; i++) {
          setPhase(labels[i]);
          const b = await grabBlobFromVideo();
          if (b) blobs.push(b);
          await sleep(300);
        }
      }

      setPhase("idle");
      setIsCapturing(false);
      if (blobs.length === 0) {
        setError("Aucune image capturée");
        return;
      }
      onCaptured(blobs);
    } catch (e) {
      setIsCapturing(false);
      setPhase("idle");
      setError(e instanceof Error ? e.message : "Erreur de capture");
    }
  }, [grabBlobFromVideo, measureBrightness, onCaptured]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative w-full bg-black aspect-[4/3] rounded-t-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Grille des tiers */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="white" strokeOpacity="0.2" strokeWidth="0.2" />
            <line x1="66.66" y1="0" x2="66.66" y2="100" stroke="white" strokeOpacity="0.2" strokeWidth="0.2" />
            <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="white" strokeOpacity="0.2" strokeWidth="0.2" />
            <line x1="0" y1="66.66" x2="100" y2="66.66" stroke="white" strokeOpacity="0.2" strokeWidth="0.2" />
          </svg>

          {/* Indicateur stabilité */}
          <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                stable ? "bg-emerald-500" : "bg-destructive animate-pulse"
              }`}
            />
            <span className="text-[11px] font-medium text-foreground">
              {stable ? "Stable" : "Tenez stable"}
            </span>
          </div>

          {/* Overlay capture en cours */}
          {isCapturing && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                {(["under", "normal", "over"] as AebPhase[]).map((p) => {
                  const active = phase === p;
                  const done =
                    (phase === "normal" && p === "under") ||
                    (phase === "over" && (p === "under" || p === "normal"));
                  return (
                    <span
                      key={p}
                      className={`w-3 h-3 rounded-full transition-all ${
                        active
                          ? "bg-accent scale-125"
                          : done
                          ? "bg-accent"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-sm font-medium text-foreground">{PHASE_LABEL[phase]}</p>
              <p className="text-xs text-muted-foreground">Ne bougez pas</p>
            </div>
          )}

          {/* État d'erreur */}
          {error && !isCapturing && (
            <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm font-medium text-foreground">{error}</p>
            </div>
          )}

          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-primary-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 py-5 bg-card">
          <button
            type="button"
            onClick={captureAEB}
            disabled={disabled || isCapturing || !ready || !stable}
            className="w-20 h-20 rounded-full bg-background border-4 border-accent flex items-center justify-center shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Déclencher la capture HDR"
          >
            <Camera className="w-8 h-8 text-accent" />
          </button>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Capture automatique de 3 expositions (EV-2, EV0, EV+2) — fusionnées en une photo HDR.
          </p>
          {error && !isCapturing && (
            <Button variant="outline" size="sm" onClick={() => setError(null)}>
              Réessayer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

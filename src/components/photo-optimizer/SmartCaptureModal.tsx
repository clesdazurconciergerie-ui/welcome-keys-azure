import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Camera, X, RotateCcw, CheckCircle2,
  Smartphone, Hand, Loader2, Download,
} from "lucide-react";
import {
  createCanvasFromSource,
  processPhoto,
  type ProcessingProgress,
  type ProcessedResult,
} from "@/lib/photo-engine";

interface SmartCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (result: ProcessedResult) => void;
}

type CaptureStage = 'init' | 'stabilizing' | 'capturing' | 'processing' | 'preview' | 'error';

export default function SmartCaptureModal({ open, onClose, onCapture }: SmartCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<HTMLCanvasElement | null>(null);

  const [stage, setStage] = useState<CaptureStage>('init');
  const [isStable, setIsStable] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = useCallback(async () => {
    try {
      setStage('init');
      setErrorMsg('');
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStage('stabilizing');
    } catch {
      setStage('error');
      setErrorMsg("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, [facingMode]);

  // Simple stability detection
  useEffect(() => {
    if (stage !== 'stabilizing' || !videoRef.current) return;
    let animId: number;
    let stableFrames = 0;

    const checkStability = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animId = requestAnimationFrame(checkStability);
        return;
      }
      const currentFrame = createCanvasFromSource(videoRef.current, 320, 240);
      if (prevFrameRef.current) {
        const stable = isFrameStable(prevFrameRef.current, currentFrame);
        if (stable) {
          stableFrames++;
          if (stableFrames >= 8) setIsStable(true);
        } else {
          stableFrames = Math.max(0, stableFrames - 2);
          setIsStable(false);
        }
      }
      prevFrameRef.current = currentFrame;
      animId = requestAnimationFrame(checkStability);
    };

    animId = requestAnimationFrame(checkStability);
    return () => cancelAnimationFrame(animId);
  }, [stage]);

  // Start camera on open
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setStage('init');
      setResult(null);
      setIsStable(false);
      setProgress(null);
      prevFrameRef.current = null;
    }
  }, [open, startCamera]);

  // AUTO-CAPTURE: when stable, capture and process automatically
  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current) return;
    
    setStage('capturing');
    
    // Brief flash effect, then capture
    await new Promise(r => setTimeout(r, 150));
    
    const sourceCanvas = createCanvasFromSource(videoRef.current);
    setStage('processing');

    try {
      const processed = await processPhoto(sourceCanvas, (p) => setProgress(p));
      setResult(processed);
      setStage('preview');
    } catch {
      setStage('error');
      setErrorMsg('Erreur lors du traitement');
    }
  }, []);

  const handleAccept = () => {
    if (result) { onCapture(result); onClose(); }
  };

  const handleRetry = () => {
    setResult(null);
    setProgress(null);
    setStage('stabilizing');
    setIsStable(false);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (open && stage !== 'init') startCamera();
  }, [facingMode]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden bg-black border-none rounded-2xl [&>button]:hidden">
        <div className="relative flex flex-col h-[80vh] max-h-[700px]">
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors">
            <X className="h-5 w-5" />
          </button>

          {/* Camera / Preview */}
          <div className="flex-1 relative overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover transition-opacity duration-300", stage === 'preview' && "opacity-0")} />

            {stage === 'preview' && result && (
              <img src={result.dataUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain bg-black animate-fade-in" />
            )}

            {stage === 'capturing' && (
              <div className="absolute inset-0 bg-white/80 z-30 animate-pulse" />
            )}

            {stage === 'processing' && progress && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
                <div className="relative h-16 w-16 mb-5">
                  <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-white animate-spin" />
                  <Camera className="absolute inset-0 m-auto h-6 w-6 text-white animate-pulse" />
                </div>
                <p className="text-white text-sm font-medium">{progress.message}</p>
                <div className="w-48 h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <p className="text-white/50 text-xs mt-2">{progress.progress}%</p>
              </div>
            )}

            {stage === 'error' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80">
                <X className="h-12 w-12 text-red-400 mb-4" />
                <p className="text-white text-sm text-center px-8">{errorMsg}</p>
                <Button onClick={startCamera} variant="outline" size="sm" className="mt-4 rounded-xl">
                  <RotateCcw className="h-4 w-4 mr-2" /> Réessayer
                </Button>
              </div>
            )}

            {/* Stability indicator */}
            {stage === 'stabilizing' && (
              <div className="absolute bottom-24 left-0 right-0 flex justify-center z-20">
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md transition-all duration-500",
                  isStable ? "bg-green-500/20 border border-green-400/30" : "bg-yellow-500/20 border border-yellow-400/30"
                )}>
                  {isStable ? (
                    <><CheckCircle2 className="h-4 w-4 text-green-400" /><span className="text-green-300 text-xs font-medium">Stable — appuyez pour capturer</span></>
                  ) : (
                    <><Hand className="h-4 w-4 text-yellow-400 animate-pulse" /><span className="text-yellow-300 text-xs font-medium">Stabilisez l'appareil…</span></>
                  )}
                </div>
              </div>
            )}

            {/* Grid overlay */}
            {stage === 'stabilizing' && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/15" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/15" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/15" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/15" />
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex-shrink-0 bg-black/90 backdrop-blur px-6 py-5">
            {stage === 'preview' && result ? (
              <div className="flex items-center justify-between">
                <Button onClick={handleRetry} variant="ghost" className="text-white hover:bg-white/10 rounded-xl gap-2">
                  <RotateCcw className="h-4 w-4" /> Reprendre
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs">{Math.round(result.processingTimeMs)}ms</span>
                  <Button onClick={handleAccept} className="rounded-xl gap-2 shadow-lg">
                    <CheckCircle2 className="h-4 w-4" /> Utiliser
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6">
                <button onClick={toggleCamera} className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                  <Smartphone className="h-5 w-5" />
                </button>
                <button
                  onClick={captureAndProcess}
                  disabled={stage !== 'stabilizing' || !isStable}
                  className={cn(
                    "relative h-[72px] w-[72px] rounded-full transition-all duration-300 flex items-center justify-center",
                    stage === 'stabilizing' && isStable
                      ? "bg-white shadow-lg shadow-white/20 hover:scale-105 active:scale-95"
                      : "bg-white/30 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "h-[60px] w-[60px] rounded-full border-2 transition-colors",
                    stage === 'stabilizing' && isStable ? "border-black/10 bg-white" : "border-white/20 bg-white/20"
                  )}>
                    {stage === 'stabilizing' && !isStable && (
                      <Loader2 className="h-6 w-6 text-white/60 absolute inset-0 m-auto animate-spin" />
                    )}
                  </div>
                </button>
                <div className="w-11" />
              </div>
            )}
          </div>

          {/* Top info */}
          {stage === 'stabilizing' && (
            <div className="absolute top-4 left-4 z-40">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
                <Camera className="h-3.5 w-3.5 text-white/80" />
                <span className="text-white/80 text-xs font-medium">Photo Pro</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Simple motion detection ────────────────────────────
function isFrameStable(prev: HTMLCanvasElement, curr: HTMLCanvasElement): boolean {
  const w = Math.min(prev.width, curr.width, 320);
  const h = Math.min(prev.height, curr.height, 240);
  const getPixels = (s: HTMLCanvasElement) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(s, 0, 0, w, h);
    return c.getContext('2d')!.getImageData(0, 0, w, h).data;
  };
  const pd = getPixels(prev), cd = getPixels(curr);
  let diff = 0;
  const n = w * h;
  for (let i = 0; i < pd.length; i += 4) {
    diff += (Math.abs(pd[i] - cd[i]) + Math.abs(pd[i + 1] - cd[i + 1]) + Math.abs(pd[i + 2] - cd[i + 2])) / 3;
  }
  return (diff / n) < 15;
}

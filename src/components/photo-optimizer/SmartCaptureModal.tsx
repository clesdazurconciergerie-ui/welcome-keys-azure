import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Camera, X, RotateCcw, CheckCircle2,
  Smartphone, Hand, Loader2, Zap,
} from "lucide-react";
import {
  createCanvasFromSource,
  processHDR,
  detectMotion,
  type CaptureProgress,
  type HDRResult,
} from "@/lib/hdr-processor";

interface SmartCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onCapture: (result: HDRResult) => void;
}

type CaptureStage = 'init' | 'stabilizing' | 'countdown' | 'capturing' | 'processing' | 'preview' | 'error';

export default function SmartCaptureModal({ open, onClose, onCapture }: SmartCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<HTMLCanvasElement | null>(null);
  const stabilityTimerRef = useRef<number>(0);

  const [stage, setStage] = useState<CaptureStage>('init');
  const [countdown, setCountdown] = useState(3);
  const [isStable, setIsStable] = useState(false);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [hdrResult, setHdrResult] = useState<HDRResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      setStage('init');
      setErrorMsg('');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
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

  // Stability detection loop
  useEffect(() => {
    if (stage !== 'stabilizing' || !videoRef.current) return;

    let animId: number;
    let stableFrames = 0;
    const STABLE_THRESHOLD = 8; // frames needed

    const checkStability = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animId = requestAnimationFrame(checkStability);
        return;
      }

      const currentFrame = createCanvasFromSource(videoRef.current, 320, 240);

      if (prevFrameRef.current) {
        const { isStable: stable } = detectMotion(prevFrameRef.current, currentFrame, 15);
        if (stable) {
          stableFrames++;
          if (stableFrames >= STABLE_THRESHOLD) {
            setIsStable(true);
          }
        } else {
          stableFrames = Math.max(0, stableFrames - 2);
          setIsStable(false);
        }
      }

      prevFrameRef.current = currentFrame;
      stabilityTimerRef.current = Date.now();
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
      setHdrResult(null);
      setIsStable(false);
      prevFrameRef.current = null;
    }
  }, [open, startCamera]);

  // Countdown & capture
  const startCapture = useCallback(async () => {
    setStage('countdown');
    
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 800));
    }

    setStage('capturing');

    if (!videoRef.current) {
      setStage('error');
      setErrorMsg('Vidéo non disponible');
      return;
    }

    // Capture the frame at full resolution
    const sourceCanvas = createCanvasFromSource(videoRef.current);

    setStage('processing');

    try {
      const result = await processHDR(sourceCanvas, (p) => setProgress(p), 'quality');
      setHdrResult(result);
      setStage('preview');
    } catch {
      setStage('error');
      setErrorMsg('Erreur lors du traitement HDR');
    }
  }, []);

  const handleAccept = () => {
    if (hdrResult) {
      onCapture(hdrResult);
      onClose();
    }
  };

  const handleRetry = () => {
    setHdrResult(null);
    setProgress(null);
    setStage('stabilizing');
    setIsStable(false);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Camera flip triggers restart
  useEffect(() => {
    if (open && stage !== 'init') {
      startCamera();
    }
  }, [facingMode]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-[95vw] p-0 overflow-hidden bg-black border-none rounded-2xl [&>button]:hidden">
        <div className="relative flex flex-col h-[80vh] max-h-[700px]">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Camera feed / Preview */}
          <div className="flex-1 relative overflow-hidden bg-black">
            {/* Live video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                stage === 'preview' && "opacity-0"
              )}
            />

            {/* HDR Preview */}
            {stage === 'preview' && hdrResult && (
              <img
                src={hdrResult.dataUrl}
                alt="HDR Preview"
                className="absolute inset-0 w-full h-full object-contain bg-black animate-fade-in"
              />
            )}

            {/* Countdown overlay */}
            {stage === 'countdown' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                <div className="text-8xl font-bold text-white animate-pulse drop-shadow-2xl">
                  {countdown}
                </div>
              </div>
            )}

            {/* Capturing flash */}
            {stage === 'capturing' && (
              <div className="absolute inset-0 bg-white/80 z-30 animate-pulse" />
            )}

            {/* Processing overlay */}
            {stage === 'processing' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
                <div className="relative h-16 w-16 mb-5">
                  <div className="absolute inset-0 rounded-full border-2 border-white/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-white animate-spin" />
                  <Zap className="absolute inset-0 m-auto h-6 w-6 text-white animate-pulse" />
                </div>
                <p className="text-white text-sm font-medium">{progress?.message || 'Traitement…'}</p>
                {progress && (
                  <div className="w-48 mt-3">
                    <Progress value={progress.progress} className="h-1.5 bg-white/20" />
                  </div>
                )}
              </div>
            )}

            {/* Error overlay */}
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
                  isStable
                    ? "bg-green-500/20 border border-green-400/30"
                    : "bg-yellow-500/20 border border-yellow-400/30"
                )}>
                  {isStable ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <span className="text-green-300 text-xs font-medium">Stable — prêt</span>
                    </>
                  ) : (
                    <>
                      <Hand className="h-4 w-4 text-yellow-400 animate-pulse" />
                      <span className="text-yellow-300 text-xs font-medium">Stabilisez l'appareil…</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Grid overlay for composition */}
            {(stage === 'stabilizing' || stage === 'countdown') && (
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
            {stage === 'preview' && hdrResult ? (
              <div className="flex items-center justify-between">
                <Button
                  onClick={handleRetry}
                  variant="ghost"
                  className="text-white hover:bg-white/10 rounded-xl gap-2"
                >
                  <RotateCcw className="h-4 w-4" /> Reprendre
                </Button>
                <div className="text-center">
                  <p className="text-white/60 text-[10px]">
                    HDR · {hdrResult.bracketCount} expositions · {Math.round(hdrResult.processingTimeMs)}ms
                  </p>
                </div>
                <Button
                  onClick={handleAccept}
                  className="rounded-xl gap-2 shadow-lg"
                >
                  <CheckCircle2 className="h-4 w-4" /> Utiliser
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-6">
                {/* Flip camera */}
                <button
                  onClick={toggleCamera}
                  className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Smartphone className="h-5 w-5" />
                </button>

                {/* Capture button */}
                <button
                  onClick={startCapture}
                  disabled={stage !== 'stabilizing' || !isStable}
                  className={cn(
                    "relative h-[72px] w-[72px] rounded-full transition-all duration-300",
                    "flex items-center justify-center",
                    stage === 'stabilizing' && isStable
                      ? "bg-white shadow-lg shadow-white/20 hover:scale-105 active:scale-95"
                      : "bg-white/30 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "h-[60px] w-[60px] rounded-full border-2 transition-colors",
                    stage === 'stabilizing' && isStable
                      ? "border-black/10 bg-white"
                      : "border-white/20 bg-white/20"
                  )}>
                    {stage === 'stabilizing' && !isStable && (
                      <Loader2 className="h-6 w-6 text-white/60 absolute inset-0 m-auto animate-spin" />
                    )}
                  </div>
                </button>

                {/* Placeholder for balance */}
                <div className="w-11" />
              </div>
            )}
          </div>

          {/* Top info bar */}
          {stage === 'stabilizing' && (
            <div className="absolute top-4 left-4 z-40">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
                <Camera className="h-3.5 w-3.5 text-white/80" />
                <span className="text-white/80 text-xs font-medium">Photo Pro HDR</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

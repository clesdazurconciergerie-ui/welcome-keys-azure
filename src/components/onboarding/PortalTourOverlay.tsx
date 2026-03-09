import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, ArrowLeft, X, Pause,
  LayoutDashboard, Home, Briefcase, ClipboardCheck, BookOpen, Euro,
  Bell, Camera, CheckCircle,
} from "lucide-react";
import type { TourStep } from "@/hooks/useGuidedTour";

const ICON_MAP: Record<string, React.ElementType> = {
  "layout-dashboard": LayoutDashboard,
  home: Home,
  briefcase: Briefcase,
  "clipboard-check": ClipboardCheck,
  "book-open": BookOpen,
  euro: Euro,
  bell: Bell,
  camera: Camera,
  "check-circle": CheckCircle,
};

interface PortalTourOverlayProps {
  isActive: boolean;
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  progressPercent: number;
  steps: TourStep[];
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onPause: () => void;
  onAction: () => void;
  isLastStep: boolean;
}

export function PortalTourOverlay({
  isActive,
  step,
  stepIndex,
  totalSteps,
  progressPercent,
  steps,
  onNext,
  onPrev,
  onSkip,
  onPause,
  onAction,
  isLastStep,
}: PortalTourOverlayProps) {
  const StepIcon = ICON_MAP[step.icon] || LayoutDashboard;

  return (
    <AnimatePresence>
      {isActive && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-[2px] pointer-events-auto"
            onClick={onPause}
          />

          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 30, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 30, y: 10 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-[9995] w-[420px] max-w-[calc(100vw-2rem)]"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(232,85%,14%)] via-[hsl(232,85%,11%)] to-[hsl(232,80%,9%)]" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-[radial-gradient(circle,hsl(42,46%,56%,0.06)_0%,transparent_70%)]" />

              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[hsl(var(--gold))]/70">
                      Visite guidée
                    </span>
                    <span className="text-white/20 text-[10px]">•</span>
                    <span className="text-[10px] font-medium text-white/30">
                      {stepIndex + 1} / {totalSteps}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={onPause}
                      className="p-1.5 rounded-md text-white/25 hover:text-white/50 hover:bg-white/5 transition-all"
                      title="Mettre en pause"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={onSkip}
                      className="p-1.5 rounded-md text-white/25 hover:text-white/50 hover:bg-white/5 transition-all"
                      title="Terminer la visite"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="h-1 w-full rounded-full bg-white/[0.06] mb-5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center shrink-0">
                      <StepIcon className="w-5 h-5 text-[hsl(var(--gold))]" />
                    </div>
                    <h3 className="text-lg font-bold text-white leading-tight">{step.title}</h3>
                  </div>

                  <p className="text-white/60 text-sm leading-relaxed">
                    {step.explanation}
                  </p>

                  <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                    <p className="text-[11px] font-medium text-[hsl(var(--gold))]/60 uppercase tracking-wider mb-1">
                      Cas d'usage
                    </p>
                    <p className="text-white/45 text-xs leading-relaxed">
                      {step.useCase}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/[0.06]">
                  <Button
                    variant="ghost"
                    onClick={onPrev}
                    disabled={stepIndex === 0}
                    className="text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:hover:bg-transparent h-9 px-3 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Précédent
                  </Button>

                  <div className="flex gap-2">
                    {step.ctaRoute && (
                      <Button
                        variant="ghost"
                        onClick={onAction}
                        className="text-[hsl(var(--gold))]/70 hover:text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/5 h-9 px-3 text-xs font-medium"
                      >
                        {step.ctaLabel}
                      </Button>
                    )}
                    <Button
                      onClick={onNext}
                      className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--brand-blue))] font-semibold hover:opacity-90 h-9 px-4 text-xs"
                    >
                      {isLastStep ? "Terminer" : "Suivant"}
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === stepIndex
                          ? "w-4 bg-[hsl(var(--gold))]"
                          : i < stepIndex
                          ? "w-1.5 bg-[hsl(var(--gold))]/40"
                          : "w-1.5 bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

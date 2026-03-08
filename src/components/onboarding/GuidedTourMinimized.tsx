import { motion, AnimatePresence } from "framer-motion";
import { Compass, ArrowRight, X } from "lucide-react";

interface GuidedTourMinimizedProps {
  visible: boolean;
  stepIndex: number;
  totalSteps: number;
  onResume: () => void;
  onClose: () => void;
}

export function GuidedTourMinimized({ visible, stepIndex, totalSteps, onResume, onClose }: GuidedTourMinimizedProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 right-4 z-[9980]"
        >
          <div className="relative rounded-xl overflow-hidden shadow-xl shadow-black/20">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(232,85%,14%)] to-[hsl(232,85%,10%)]" />
            <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(circle,hsl(42,46%,56%,0.08)_0%,transparent_70%)]" />

            <div className="relative z-10 flex items-center gap-3 pl-4 pr-2 py-2.5">
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))]/10 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4 text-[hsl(var(--gold))]" />
              </div>

              {/* Text */}
              <div className="flex flex-col mr-1">
                <span className="text-[11px] font-semibold text-white/80 leading-tight">
                  Visite guidée
                </span>
                <span className="text-[10px] text-white/35 leading-tight">
                  Étape {stepIndex + 1} / {totalSteps}
                </span>
              </div>

              {/* Progress mini-bar */}
              <div className="w-12 h-1 rounded-full bg-white/[0.08] overflow-hidden mr-1">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] transition-all duration-500"
                  style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                />
              </div>

              {/* Resume button */}
              <button
                onClick={onResume}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--brand-blue))] text-[11px] font-semibold hover:opacity-90 transition-opacity shrink-0"
              >
                Reprendre
                <ArrowRight className="w-3 h-3" />
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-white/20 hover:text-white/50 hover:bg-white/5 transition-all shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

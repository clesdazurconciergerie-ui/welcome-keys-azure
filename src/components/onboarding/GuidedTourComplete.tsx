import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, RotateCcw, Settings } from "lucide-react";

interface GuidedTourCompleteProps {
  open: boolean;
  onDashboard: () => void;
  onRestart: () => void;
  onContinue: () => void;
}

export function GuidedTourComplete({ open, onDashboard, onRestart, onContinue }: GuidedTourCompleteProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-[hsl(232,85%,8%)]/90 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-lg w-full mx-4"
          >
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(232,85%,14%)] via-[hsl(232,85%,12%)] to-[hsl(232,80%,10%)]" />
              <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,hsl(145,50%,40%,0.06)_0%,transparent_70%)]" />

              <div className="relative z-10 px-10 py-12 text-center space-y-8">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </motion.div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    Votre espace est prêt
                  </h1>
                  <p className="text-white/50 text-base leading-relaxed">
                    Vous avez découvert les fonctionnalités principales de MyWelkom.
                    <br />
                    Vous pouvez maintenant utiliser la plateforme librement.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={onDashboard}
                    className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--brand-blue))] font-semibold hover:opacity-90 h-12 text-base px-8"
                  >
                    Accéder au tableau de bord
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={onRestart}
                      className="flex items-center gap-1.5 text-white/30 hover:text-white/50 text-sm transition-colors py-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revoir le guide
                    </button>
                    <span className="text-white/10 py-2">•</span>
                    <button
                      onClick={onContinue}
                      className="flex items-center gap-1.5 text-white/30 hover:text-white/50 text-sm transition-colors py-2"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Continuer la configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

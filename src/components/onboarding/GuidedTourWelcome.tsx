import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";

interface GuidedTourWelcomeProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function GuidedTourWelcome({ open, onStart, onSkip }: GuidedTourWelcomeProps) {
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
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[hsl(232,85%,8%)]/90 backdrop-blur-md" />

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-[hsl(var(--gold))]/30"
                initial={{
                  x: `${20 + i * 12}%`,
                  y: "110%",
                  opacity: 0,
                }}
                animate={{
                  y: "-10%",
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 6 + i * 1.5,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: "linear",
                }}
              />
            ))}
          </div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-lg w-full mx-4"
          >
            <div className="relative rounded-2xl overflow-hidden">
              {/* Card bg */}
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(232,85%,14%)] via-[hsl(232,85%,12%)] to-[hsl(232,80%,10%)]" />
              <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle,hsl(42,46%,56%,0.06)_0%,transparent_70%)]" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-[radial-gradient(circle,hsl(232,60%,30%,0.15)_0%,transparent_70%)]" />

              {/* Close */}
              <button
                onClick={onSkip}
                className="absolute top-4 right-4 z-20 p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 px-10 py-12 text-center space-y-8">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative mx-auto w-20 h-20"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] opacity-20 blur-xl" />
                  <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] flex items-center justify-center shadow-lg">
                    <Sparkles className="w-10 h-10 text-[hsl(var(--brand-blue))]" />
                  </div>
                </motion.div>

                {/* Text */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="space-y-3"
                >
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    Bienvenue sur MyWelkom
                  </h1>
                  <p className="text-white/50 text-base leading-relaxed">
                    Découvrons ensemble votre plateforme de gestion conciergerie.
                  </p>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-white/35 text-sm leading-relaxed max-w-sm mx-auto"
                >
                  En quelques étapes, vous allez découvrir les fonctionnalités principales et configurer votre espace.
                </motion.p>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85, duration: 0.4 }}
                  className="flex flex-col gap-3 pt-2"
                >
                  <Button
                    onClick={onStart}
                    className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--brand-blue))] font-semibold hover:opacity-90 h-12 text-base px-8 shadow-lg shadow-[hsl(var(--gold))]/10"
                  >
                    Commencer la visite
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <button
                    onClick={onSkip}
                    className="text-white/30 hover:text-white/50 text-sm transition-colors py-2"
                  >
                    Passer pour l'instant
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

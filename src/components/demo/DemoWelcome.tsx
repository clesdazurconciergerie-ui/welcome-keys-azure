import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DemoWelcomeProps {
  onStartTour: () => void;
  onSignup: () => void;
}

export function DemoWelcome({ onStartTour, onSignup }: DemoWelcomeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <img
            src="/brand/logo-wlekom.png"
            alt="MyWelkom"
            className="h-10 mx-auto mb-6"
          />
        </motion.div>

        {/* Title block */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Aperçu interactif
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Découvrir MyWelkom
          </h1>
          <p className="text-lg text-muted-foreground">
            Explorez la plateforme en quelques minutes.
          </p>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground leading-relaxed"
        >
          Naviguez dans un aperçu interactif du tableau de bord, des missions, des états des lieux et des livrets digitaux.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            size="lg"
            onClick={onStartTour}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold shadow-sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Commencer la visite
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onSignup}
          >
            Créer mon compte
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>

        {/* Features preview */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3 pt-4"
        >
          {[
            { label: "Missions", count: "Auto" },
            { label: "Livrets", count: "Digital" },
            { label: "Finance", count: "Intégré" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-card border border-border p-3 shadow-[var(--shadow-xs)]">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold text-foreground">{item.count}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

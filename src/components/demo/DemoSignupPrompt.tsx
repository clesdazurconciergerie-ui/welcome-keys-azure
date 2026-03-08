import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

interface DemoSignupPromptProps {
  onSignup: () => void;
  onContinue: () => void;
}

export function DemoSignupPrompt({ onSignup, onContinue }: DemoSignupPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      onClick={onContinue}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl shadow-[var(--shadow-xl)] p-6 max-w-sm w-full text-center space-y-4"
      >
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-foreground">Prêt à vous lancer ?</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Créez votre conciergerie en 2 minutes pour commencer à gérer vos biens.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={onSignup}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold w-full"
          >
            Créer mon compte
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            onClick={onContinue}
            className="text-muted-foreground w-full"
          >
            Continuer la démo
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

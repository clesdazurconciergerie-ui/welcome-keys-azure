import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight, ArrowLeft, X, Sparkles,
  LayoutDashboard, Home, Briefcase, ClipboardCheck, BookOpen, Euro,
} from "lucide-react";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  "home": Home,
  "briefcase": Briefcase,
  "clipboard-check": ClipboardCheck,
  "book-open": BookOpen,
  "euro": Euro,
};

interface DemoTourOverlayProps {
  step: {
    id: string;
    title: string;
    explanation: string;
    useCase: string;
    icon: string;
  };
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onSignup: () => void;
}

export function DemoTourOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onSignup,
}: DemoTourOverlayProps) {
  const Icon = ICON_MAP[step.icon] || LayoutDashboard;
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const isLast = stepIndex === totalSteps - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-lg"
    >
      <div className="bg-card border border-border rounded-2xl shadow-[var(--shadow-xl)] overflow-hidden">
        {/* Progress */}
        <div className="px-5 pt-4 pb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Étape {stepIndex + 1} / {totalSteps}
            </span>
            <button onClick={onSkip} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{step.explanation}</p>
            </div>
          </div>

          <div className="rounded-lg bg-accent/5 border border-accent/10 p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{step.useCase}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Précédent
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSignup}
              className="text-xs"
            >
              Créer mon compte
            </Button>
            <Button
              size="sm"
              onClick={onNext}
              className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold"
            >
              {isLast ? "Terminer" : "Suivant"}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

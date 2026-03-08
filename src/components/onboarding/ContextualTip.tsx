import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ContextualTipProps {
  tipId: string;
  title?: string;
  children: React.ReactNode;
}

export function ContextualTip({ tipId, title, children }: ContextualTipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem("mywelkom_tips_dismissed") || "[]");
    if (!dismissed.includes(tipId)) {
      setVisible(true);
    }
  }, [tipId]);

  const dismiss = () => {
    setVisible(false);
    const dismissed = JSON.parse(localStorage.getItem("mywelkom_tips_dismissed") || "[]");
    if (!dismissed.includes(tipId)) {
      localStorage.setItem("mywelkom_tips_dismissed", JSON.stringify([...dismissed, tipId]));
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[hsl(var(--gold))]/[0.06] border border-[hsl(var(--gold))]/15 mb-4">
            <Lightbulb className="w-4 h-4 text-[hsl(var(--gold))] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {title && (
                <p className="text-sm font-medium text-foreground mb-0.5">{title}</p>
              )}
              <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 p-1 rounded hover:bg-muted/50 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

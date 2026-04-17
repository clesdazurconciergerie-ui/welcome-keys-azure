import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Check } from "lucide-react";

interface Props {
  progress: number;
  label: string;
  estimatedSeconds?: number;
}

const STEPS = [
  { pct: 15, name: "Analyse des expositions" },
  { pct: 50, name: "Fusion HDR multi-couches" },
  { pct: 75, name: "Optimisation des couleurs" },
  { pct: 92, name: "Microcontraste & clarté" },
  { pct: 100, name: "Finalisation Welkom Studio" },
];

export function WelkomStudioProgress({ progress, label, estimatedSeconds = 8 }: Props) {
  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 via-background to-background">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center animate-pulse">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Welkom Studio en action</p>
            <p className="text-xs text-muted-foreground">{label || "Préparation…"}</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">~{estimatedSeconds}s</span>
        </div>

        <Progress value={progress} className="h-2" />

        <ul className="space-y-1.5">
          {STEPS.map((s) => {
            const done = progress >= s.pct;
            const active = progress >= s.pct - 15 && !done;
            return (
              <li key={s.name} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                    done
                      ? "bg-accent text-primary"
                      : active
                      ? "bg-accent/30 text-accent animate-pulse"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                <span
                  className={
                    done
                      ? "text-foreground font-medium"
                      : active
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {s.name}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

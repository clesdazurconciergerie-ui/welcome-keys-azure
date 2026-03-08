import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Home, Users, Wrench, Briefcase, ClipboardCheck, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { OnboardingState } from "@/hooks/useOnboarding";

interface OnboardingProgressProps {
  progress: OnboardingState;
  completionPercent: number;
  isFullyComplete: boolean;
}

const checklist = [
  { key: "hasProperty" as const, label: "Ajouter un logement", icon: Home, route: "/dashboard/logements" },
  { key: "hasOwner" as const, label: "Ajouter un propriétaire", icon: Users, route: "/dashboard/proprietaires" },
  { key: "hasProvider" as const, label: "Ajouter un prestataire", icon: Wrench, route: "/dashboard/prestataires" },
  { key: "hasMission" as const, label: "Créer une mission", icon: Briefcase, route: "/dashboard/missions" },
  { key: "hasInspection" as const, label: "Générer un état des lieux", icon: ClipboardCheck, route: "/dashboard/etats-des-lieux" },
  { key: "hasBooklet" as const, label: "Publier un livret digital", icon: BookOpen, route: "/dashboard/livrets" },
];

export function OnboardingProgress({ progress, completionPercent, isFullyComplete }: OnboardingProgressProps) {
  const navigate = useNavigate();

  if (isFullyComplete) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-[hsl(var(--gold))]/20 bg-gradient-to-br from-card to-[hsl(var(--gold))]/[0.02]">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-base">
                Configuration de votre conciergerie
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {completionPercent}% complété
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
              <span className="text-lg font-bold text-[hsl(var(--gold))]">{completionPercent}%</span>
            </div>
          </div>

          <Progress value={completionPercent} className="h-2 mb-5" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklist.map((item) => {
              const done = progress[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => !done && navigate(item.route)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                    done
                      ? "text-muted-foreground"
                      : "cursor-pointer hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {done ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={done ? "line-through opacity-60" : "font-medium"}>
                    {item.label}
                  </span>
                  {!done && <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground/40" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

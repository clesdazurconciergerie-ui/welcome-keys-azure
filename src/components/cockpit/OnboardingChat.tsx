import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export const ONBOARDING_QUESTIONS = [
  "Combien de biens gères-tu actuellement, et combien vises-tu dans 6 mois ?",
  "Combien d'heures par semaine peux-tu réellement consacrer à Azur Keys ?",
  "Quel est ton CA mensuel moyen actuel, et ton objectif à 6 mois ?",
  "Quels sont tes 2-3 blocages principaux aujourd'hui (opérationnel, commercial, tech) ?",
  "Qu'est-ce qui te prend le plus de temps chaque semaine et que tu voudrais automatiser ?",
  "À quoi ressemble le succès idéal dans 6 mois — décris en 2 phrases ?",
];

export default function OnboardingChat({
  open, onCancel, onFinish,
}: {
  open: boolean;
  onCancel: () => void;
  onFinish: (answers: Record<string, string>) => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(ONBOARDING_QUESTIONS.length).fill(""));
  const [busy, setBusy] = useState(false);

  const reset = () => { setStep(0); setAnswers(Array(ONBOARDING_QUESTIONS.length).fill("")); };
  const isLast = step === ONBOARDING_QUESTIONS.length - 1;
  const cur = ONBOARDING_QUESTIONS[step];

  const next = async () => {
    if (!answers[step].trim()) return;
    if (!isLast) { setStep(s => s + 1); return; }
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      ONBOARDING_QUESTIONS.forEach((q, i) => { payload[q] = answers[i]; });
      await onFinish(payload);
      reset();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) { onCancel(); reset(); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Repartons de zéro — question {step + 1}/{ONBOARDING_QUESTIONS.length}</DialogTitle>
        </DialogHeader>
        {busy ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin"/>
            <p className="text-sm text-muted-foreground">L'IA construit ton plan de départ…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-1 bg-muted overflow-hidden">
              <div className="h-full bg-foreground transition-all" style={{ width: `${((step + 1) / ONBOARDING_QUESTIONS.length) * 100}%` }}/>
            </div>
            <p className="text-base">{cur}</p>
            <Textarea
              value={answers[step]}
              onChange={e => setAnswers(a => { const n = [...a]; n[step] = e.target.value; return n; })}
              rows={4}
              autoFocus
              placeholder="Ta réponse…"
            />
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
                Précédent
              </Button>
              <Button size="sm" onClick={next} disabled={!answers[step].trim()}>
                {isLast ? "Générer mon plan" : "Suivant"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

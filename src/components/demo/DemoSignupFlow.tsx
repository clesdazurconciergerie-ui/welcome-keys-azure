import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Building2, Mail, Lock, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DemoSignupFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

const STEPS = [
  { id: "company", label: "Votre conciergerie", icon: Building2 },
  { id: "email", label: "Votre email", icon: Mail },
  { id: "password", label: "Mot de passe", icon: Lock },
];

export function DemoSignupFlow({ onComplete, onBack }: DemoSignupFlowProps) {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canNext =
    (step === 0 && companyName.trim().length > 1) ||
    (step === 1 && email.includes("@")) ||
    (step === 2 && password.length >= 6);

  const handleNext = async () => {
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    // Step 2: Create account
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { company_name: companyName },
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        setDone(true);
        setTimeout(() => onComplete(), 2000);
      } else {
        toast.success("Vérifiez votre email pour confirmer votre compte.");
        setDone(true);
        setTimeout(() => onComplete(), 3000);
      }
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center p-4"
      >
        <div className="text-center space-y-4 max-w-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto"
          >
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground">Votre espace est prêt</h2>
          <p className="text-muted-foreground">Redirection vers votre tableau de bord...</p>
        </div>
      </motion.div>
    );
  }

  const currentStep = STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="max-w-sm w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src="/brand/logo-wlekom.png" alt="MyWelkom" className="h-8 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground">Créer mon compte</h2>
          <p className="text-sm text-muted-foreground">Étape {step + 1} sur {STEPS.length}</p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2 justify-center">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "bg-[hsl(var(--gold))] w-10" : "bg-border w-6"
              }`}
            />
          ))}
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-4"
          >
            {step === 0 && (
              <div className="space-y-2">
                <Label htmlFor="company">Nom de votre conciergerie</Label>
                <Input
                  id="company"
                  placeholder="Ex : Azur Conciergerie"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={step === 0 ? onBack : () => setStep(step - 1)}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canNext || loading}
            className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-primary font-semibold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step === 2 ? (
              <>
                Créer mon compte
                <CheckCircle className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Continuer
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

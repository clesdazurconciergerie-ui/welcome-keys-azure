import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette, Home, Users, Wrench, ClipboardCheck, CheckCircle, ArrowRight, ArrowLeft, Sparkles,
} from "lucide-react";

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: Palette,
    title: "Identité de la conciergerie",
    description: "Configurez votre identité pour personnaliser tous vos documents.",
    details: [
      "Nom de la conciergerie",
      "Logo",
      "Couleurs (branding global)",
      "Signature conciergerie",
      "Coordonnées",
    ],
    note: "Ces éléments s'appliqueront automatiquement aux factures, états des lieux, livrets digitaux et documents PDF.",
    action: "Configurer l'identité",
    route: "/dashboard/branding",
  },
  {
    icon: Home,
    title: "Ajouter un logement",
    description: "Les logements sont le cœur de votre activité.",
    details: [
      "Missions ménage",
      "États des lieux",
      "Livrets d'accueil digitaux",
      "Propriétaires associés",
      "Suivi des revenus",
    ],
    note: "Chaque logement permet de gérer l'ensemble de ces éléments.",
    action: "Ajouter un logement",
    route: "/dashboard/logements",
  },
  {
    icon: Users,
    title: "Ajouter un propriétaire",
    description: "Associez chaque logement à son propriétaire pour lui donner accès à son espace dédié.",
    details: [
      "Suivre les réservations",
      "Consulter les revenus",
      "Voir les états des lieux",
      "Accéder au livret digital",
    ],
    note: "Les propriétaires auront leur propre tableau de bord.",
    action: "Ajouter un propriétaire",
    route: "/dashboard/proprietaires",
  },
  {
    icon: Wrench,
    title: "Ajouter un prestataire",
    description: "Les prestataires reçoivent les missions (ménage, intervention, etc.).",
    details: [
      "Accepter des missions",
      "Envoyer des photos ménage",
      "Signaler des incidents",
      "Valider les interventions",
    ],
    note: "Les prestataires ont leur propre espace de travail.",
    action: "Ajouter un prestataire",
    route: "/dashboard/prestataires",
  },
  {
    icon: ClipboardCheck,
    title: "Créer votre premier état des lieux",
    description: "Les états des lieux permettent de documenter l'arrivée et la sortie des voyageurs.",
    details: [
      "Photos du dernier ménage",
      "Signature voyageur",
      "Signature conciergerie",
      "Génération automatique du PDF",
    ],
    note: "Le système utilise automatiquement les photos du dernier ménage.",
    action: "Créer un état des lieux",
    route: "/dashboard/etats-des-lieux",
  },
];

export function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = welcome screen
  const navigate = useNavigate();

  const handleAction = () => {
    if (currentStep >= 0 && currentStep < steps.length) {
      navigate(steps[currentStep].route);
      onClose();
    }
  };

  const handleComplete = () => {
    onClose();
    navigate("/dashboard");
  };

  const isWelcome = currentStep === -1;
  const isComplete = currentStep === steps.length;
  const step = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <div className="relative rounded-xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(232,85%,12%)] via-[hsl(232,85%,15%)] to-[hsl(232,70%,20%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle,hsl(42,46%,56%,0.08)_0%,transparent_70%)]" />

          <div className="relative z-10 p-8">
            <AnimatePresence mode="wait">
              {/* Welcome Screen */}
              {isWelcome && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center space-y-6"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] flex items-center justify-center shadow-lg">
                    <Sparkles className="w-8 h-8 text-[hsl(var(--brand-blue))]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Bienvenue sur MyWelkom
                    </h2>
                    <p className="text-white/60 text-sm">
                      La plateforme digitale pour piloter votre conciergerie.
                    </p>
                  </div>
                  <p className="text-white/50 text-sm">
                    Configurons votre espace en quelques étapes.
                  </p>
                  <Button
                    onClick={() => setCurrentStep(0)}
                    className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--brand-blue))] font-semibold hover:opacity-90 px-8 h-11"
                  >
                    Commencer la configuration
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Steps */}
              {step && (
                <motion.div
                  key={`step-${currentStep}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="space-y-5"
                >
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i <= currentStep
                            ? "bg-[hsl(var(--gold))]"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-white/40 text-xs font-medium tracking-wide uppercase">
                    Étape {currentStep + 1} sur {steps.length}
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[hsl(var(--gold))]/15 flex items-center justify-center shrink-0">
                      <step.icon className="w-6 h-6 text-[hsl(var(--gold))]" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{step.title}</h3>
                  </div>

                  <p className="text-white/70 text-sm">{step.description}</p>

                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                        <CheckCircle className="w-3.5 h-3.5 text-[hsl(var(--gold))]/70 shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>

                  <p className="text-white/40 text-xs italic">{step.note}</p>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="text-white/50 hover:text-white hover:bg-white/5"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Retour
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setCurrentStep(
                            currentStep < steps.length - 1
                              ? currentStep + 1
                              : steps.length
                          )
                        }
                        className="text-white/40 hover:text-white/70 hover:bg-white/5 text-sm"
                      >
                        Passer
                      </Button>
                      <Button
                        onClick={handleAction}
                        className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--brand-blue))] font-semibold hover:opacity-90"
                      >
                        {step.action}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Complete Screen */}
              {isComplete && (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Configuration terminée
                    </h2>
                    <p className="text-white/60 text-sm">
                      Votre conciergerie est prête.
                    </p>
                  </div>
                  <Button
                    onClick={handleComplete}
                    className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--gold-light))] text-[hsl(var(--brand-blue))] font-semibold hover:opacity-90 px-8 h-11"
                  >
                    Accéder au tableau de bord
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

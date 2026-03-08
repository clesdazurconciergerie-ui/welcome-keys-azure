import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DemoWelcome } from "@/components/demo/DemoWelcome";
import { DemoDashboard } from "@/components/demo/DemoDashboard";
import { DemoTourOverlay } from "@/components/demo/DemoTourOverlay";
import { DemoSignupFlow } from "@/components/demo/DemoSignupFlow";
import { DemoSignupPrompt } from "@/components/demo/DemoSignupPrompt";

export type DemoPhase = "welcome" | "touring" | "exploring" | "signup";

const DEMO_TOUR_STEPS = [
  {
    id: "dashboard",
    title: "Tableau de bord",
    explanation: "Vue d'ensemble en temps réel de votre activité : missions du jour, réservations, indicateurs clés et relances automatiques.",
    useCase: "Chaque matin, consultez votre tableau de bord pour prioriser vos actions.",
    icon: "layout-dashboard" as const,
    tab: "dashboard" as const,
  },
  {
    id: "logements",
    title: "Gestion des logements",
    explanation: "Centralisez tous vos biens : adresses, calendriers iCal, paramètres de ménage, propriétaires associés.",
    useCase: "Ajoutez un bien en quelques clics et connectez son calendrier Airbnb ou Booking.",
    icon: "home" as const,
    tab: "logements" as const,
  },
  {
    id: "missions",
    title: "Missions & prestataires",
    explanation: "Planifiez et assignez les missions de ménage, check-in et interventions techniques à vos prestataires.",
    useCase: "Les missions se créent automatiquement à chaque nouvelle réservation.",
    icon: "briefcase" as const,
    tab: "missions" as const,
  },
  {
    id: "inspections",
    title: "États des lieux",
    explanation: "Documentez chaque entrée et sortie avec photos, relevés de compteurs, signatures et génération PDF.",
    useCase: "Générez un PDF professionnel signé en quelques minutes sur tablette.",
    icon: "clipboard-check" as const,
    tab: "inspections" as const,
  },
  {
    id: "livrets",
    title: "Livrets d'accueil digitaux",
    explanation: "Créez des livrets personnalisés : infos pratiques, WiFi, règles, activités, contacts d'urgence.",
    useCase: "Envoyez un lien unique à vos voyageurs avant leur arrivée.",
    icon: "book-open" as const,
    tab: "livrets" as const,
  },
  {
    id: "finance",
    title: "Pilotage financier",
    explanation: "Factures propriétaires, suivi des dépenses, paiements prestataires — tout est centralisé.",
    useCase: "Générez une facture propriétaire en un clic à partir des réservations du mois.",
    icon: "euro" as const,
    tab: "finance" as const,
  },
];

export default function DemoExperience() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<DemoPhase>("welcome");
  const [tourStep, setTourStep] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [promptShownAtSteps, setPromptShownAtSteps] = useState<Set<number>>(new Set());

  const currentTourStep = DEMO_TOUR_STEPS[tourStep];

  const handleStartTour = useCallback(() => {
    setPhase("touring");
    setTourStep(0);
    setActiveTab("dashboard");
  }, []);

  const handleGoToSignup = useCallback(() => {
    setPhase("signup");
    setShowSignupPrompt(false);
  }, []);

  const handleNextStep = useCallback(() => {
    const next = tourStep + 1;
    if (next >= DEMO_TOUR_STEPS.length) {
      // Tour finished — show signup prompt
      setPhase("exploring");
      setShowSignupPrompt(true);
      return;
    }
    // Show signup prompt at step 3 (after inspections)
    if (next === 3 && !promptShownAtSteps.has(3)) {
      setPromptShownAtSteps(prev => new Set(prev).add(3));
      setShowSignupPrompt(true);
    }
    setTourStep(next);
    setActiveTab(DEMO_TOUR_STEPS[next].tab);
  }, [tourStep, promptShownAtSteps]);

  const handlePrevStep = useCallback(() => {
    const prev = tourStep - 1;
    if (prev < 0) return;
    setTourStep(prev);
    setActiveTab(DEMO_TOUR_STEPS[prev].tab);
  }, [tourStep]);

  const handleSkipTour = useCallback(() => {
    setPhase("exploring");
  }, []);

  const handleSignupComplete = useCallback(() => {
    navigate("/auth?mode=signup");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/[0.03] rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {phase === "welcome" && (
          <DemoWelcome
            key="welcome"
            onStartTour={handleStartTour}
            onSignup={handleGoToSignup}
          />
        )}

        {(phase === "touring" || phase === "exploring") && (
          <motion.div
            key="demo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <DemoDashboard activeTab={activeTab} onTabChange={setActiveTab} onSignup={handleGoToSignup} />

            {phase === "touring" && currentTourStep && (
              <DemoTourOverlay
                step={currentTourStep}
                stepIndex={tourStep}
                totalSteps={DEMO_TOUR_STEPS.length}
                onNext={handleNextStep}
                onPrev={handlePrevStep}
                onSkip={handleSkipTour}
                onSignup={handleGoToSignup}
              />
            )}
          </motion.div>
        )}

        {phase === "signup" && (
          <DemoSignupFlow
            key="signup"
            onComplete={handleSignupComplete}
            onBack={() => setPhase("exploring")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignupPrompt && phase !== "signup" && (
          <DemoSignupPrompt
            onSignup={handleGoToSignup}
            onContinue={() => setShowSignupPrompt(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const TOUR_STATE_KEY = "mywelkom_guided_tour";
const TOUR_COMPLETED_KEY = "mywelkom_tour_completed";

export interface TourStep {
  id: string;
  route: string;
  title: string;
  explanation: string;
  useCase: string;
  ctaLabel: string;
  ctaRoute?: string;
  highlightSelector?: string;
  icon: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    route: "/dashboard",
    title: "Votre tableau de bord",
    explanation: "Vue d'ensemble de votre activité : missions en cours, réservations, indicateurs clés et relances.",
    useCase: "Chaque matin, consultez votre tableau de bord pour prioriser vos actions de la journée.",
    ctaLabel: "Explorer le tableau de bord",
    highlightSelector: "[data-tour='stats-grid']",
    icon: "layout-dashboard",
  },
  {
    id: "logements",
    route: "/dashboard/logements",
    title: "Ajoutez vos logements",
    explanation: "Les logements sont la base de toute votre activité. Chaque bien gère ses propres missions, états des lieux et livrets.",
    useCase: "Chaque logement permettra ensuite de gérer les missions, les états des lieux, les propriétaires et les livrets.",
    ctaLabel: "Ajouter un logement",
    ctaRoute: "/dashboard/logements",
    highlightSelector: "[data-tour='add-property']",
    icon: "home",
  },
  {
    id: "proprietaires",
    route: "/dashboard/proprietaires",
    title: "Associez les propriétaires",
    explanation: "Chaque propriétaire accède à son propre espace pour suivre réservations, revenus et documents.",
    useCase: "Associez un propriétaire à ses biens pour qu'il suive son activité en autonomie.",
    ctaLabel: "Ajouter un propriétaire",
    ctaRoute: "/dashboard/proprietaires",
    highlightSelector: "[data-tour='add-owner']",
    icon: "users",
  },
  {
    id: "prestataires",
    route: "/dashboard/prestataires",
    title: "Invitez vos prestataires",
    explanation: "Les prestataires reçoivent et gèrent les missions (ménage, interventions) depuis leur propre interface.",
    useCase: "Assignez une mission ménage à un prestataire, il la confirme et envoie les photos directement.",
    ctaLabel: "Ajouter un prestataire",
    ctaRoute: "/dashboard/prestataires",
    highlightSelector: "[data-tour='add-provider']",
    icon: "wrench",
  },
  {
    id: "missions",
    route: "/dashboard/missions",
    title: "Gérez les missions",
    explanation: "Planifiez et suivez toutes les missions : ménage, check-in, interventions techniques.",
    useCase: "Créez une mission ménage automatique à chaque départ de voyageur.",
    ctaLabel: "Créer une mission",
    ctaRoute: "/dashboard/missions",
    highlightSelector: "[data-tour='add-mission']",
    icon: "briefcase",
  },
  {
    id: "inspections",
    route: "/dashboard/etats-des-lieux",
    title: "États des lieux numériques",
    explanation: "Documentez chaque entrée et sortie avec photos, signatures et génération PDF automatique.",
    useCase: "Le système intègre automatiquement les photos du dernier ménage pour accélérer l'état des lieux.",
    ctaLabel: "Créer un état des lieux",
    ctaRoute: "/dashboard/etats-des-lieux",
    highlightSelector: "[data-tour='add-inspection']",
    icon: "clipboard-check",
  },
  {
    id: "livrets",
    route: "/dashboard/livrets",
    title: "Livrets d'accueil digitaux",
    explanation: "Créez des livrets personnalisés pour chaque logement : infos pratiques, WiFi, règles, activités.",
    useCase: "Envoyez un lien unique à vos voyageurs avant leur arrivée pour une expérience premium.",
    ctaLabel: "Créer un livret",
    ctaRoute: "/dashboard/livrets",
    highlightSelector: "[data-tour='add-booklet']",
    icon: "book-open",
  },
  {
    id: "finance",
    route: "/dashboard/finance",
    title: "Pilotez vos finances",
    explanation: "Factures, revenus, dépenses, paiements prestataires — tout est centralisé et automatisé.",
    useCase: "Générez une facture propriétaire en un clic à partir des réservations du mois.",
    ctaLabel: "Configurer les finances",
    ctaRoute: "/dashboard/finance",
    highlightSelector: "[data-tour='finance-section']",
    icon: "euro",
  },
];

interface TourState {
  currentStep: number;
  isActive: boolean;
  showWelcome: boolean;
}

export function useGuidedTour() {
  const navigate = useNavigate();
  const location = useLocation();

  const [tourState, setTourState] = useState<TourState>(() => {
    const saved = localStorage.getItem(TOUR_STATE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return { currentStep: 0, isActive: false, showWelcome: false };
  });

  const [tourCompleted, setTourCompleted] = useState(() =>
    localStorage.getItem(TOUR_COMPLETED_KEY) === "true"
  );

  // Persist state
  useEffect(() => {
    localStorage.setItem(TOUR_STATE_KEY, JSON.stringify(tourState));
  }, [tourState]);

  // Auto-show welcome for first-time users (if not completed and not already dismissed)
  const showWelcomeScreen = useCallback(() => {
    setTourState({ currentStep: 0, isActive: false, showWelcome: true });
  }, []);

  const startTour = useCallback(() => {
    const step = TOUR_STEPS[0];
    setTourState({ currentStep: 0, isActive: true, showWelcome: false });
    navigate(step.route);
  }, [navigate]);

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= TOUR_STEPS.length) return;
    const step = TOUR_STEPS[index];
    setTourState(prev => ({ ...prev, currentStep: index }));
    navigate(step.route);
  }, [navigate]);

  const nextStep = useCallback(() => {
    const next = tourState.currentStep + 1;
    if (next >= TOUR_STEPS.length) {
      // Tour complete
      setTourState({ currentStep: 0, isActive: false, showWelcome: false });
      setTourCompleted(true);
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      navigate("/dashboard");
      return;
    }
    goToStep(next);
  }, [tourState.currentStep, goToStep, navigate]);

  const prevStep = useCallback(() => {
    goToStep(tourState.currentStep - 1);
  }, [tourState.currentStep, goToStep]);

  const skipTour = useCallback(() => {
    setTourState({ currentStep: 0, isActive: false, showWelcome: false });
    setTourCompleted(true);
    localStorage.setItem(TOUR_COMPLETED_KEY, "true");
  }, []);

  const pauseTour = useCallback(() => {
    setTourState(prev => ({ ...prev, isActive: false, showWelcome: false }));
  }, []);

  const resumeTour = useCallback(() => {
    const step = TOUR_STEPS[tourState.currentStep];
    setTourState(prev => ({ ...prev, isActive: true, showWelcome: false }));
    navigate(step.route);
  }, [tourState.currentStep, navigate]);

  const restartTour = useCallback(() => {
    setTourCompleted(false);
    localStorage.removeItem(TOUR_COMPLETED_KEY);
    showWelcomeScreen();
  }, [showWelcomeScreen]);

  const currentStep = TOUR_STEPS[tourState.currentStep];
  const totalSteps = TOUR_STEPS.length;
  const progressPercent = Math.round(((tourState.currentStep + 1) / totalSteps) * 100);

  return {
    isActive: tourState.isActive,
    showWelcome: tourState.showWelcome,
    currentStepIndex: tourState.currentStep,
    currentStep,
    totalSteps,
    progressPercent,
    tourCompleted,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    pauseTour,
    resumeTour,
    restartTour,
    showWelcomeScreen,
  };
}

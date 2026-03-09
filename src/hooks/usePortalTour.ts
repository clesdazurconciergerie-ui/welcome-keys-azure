import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { TourStep } from "@/hooks/useGuidedTour";

export const PROVIDER_TOUR_STEPS: TourStep[] = [
  {
    id: "sp-dashboard",
    route: "/prestataire",
    title: "Votre tableau de bord",
    explanation: "Cette page centralise votre activité : missions à venir, tâches du jour et indicateurs de performance.",
    useCase: "Consultez cette page chaque matin pour voir vos missions du jour et prioriser votre planning.",
    ctaLabel: "Explorer le tableau de bord",
    icon: "layout-dashboard",
  },
  {
    id: "sp-missions",
    route: "/prestataire/missions",
    title: "Vos missions",
    explanation: "Les missions sont les tâches assignées par la conciergerie : ménage, check-in, interventions techniques. Consultez les détails, le statut et les instructions.",
    useCase: "Quand une nouvelle mission apparaît, ouvrez-la pour voir l'adresse, les instructions et le montant.",
    ctaLabel: "Ouvrir les missions",
    ctaRoute: "/prestataire/missions",
    icon: "briefcase",
  },
  {
    id: "sp-mission-details",
    route: "/prestataire/missions",
    title: "Détails d'une mission",
    explanation: "Chaque mission contient les instructions détaillées, les horaires et le logement concerné. Vous pouvez accepter, refuser ou marquer la mission comme terminée.",
    useCase: "Lisez attentivement les instructions avant de commencer. Signalez tout problème directement depuis la fiche.",
    ctaLabel: "Voir une mission",
    ctaRoute: "/prestataire/missions",
    icon: "clipboard-check",
  },
  {
    id: "sp-photos",
    route: "/prestataire/missions",
    title: "Envoyer des photos",
    explanation: "Après chaque intervention, uploadez des photos pour prouver la réalisation du ménage ou de la maintenance. Ces photos sont partagées avec la conciergerie et le propriétaire.",
    useCase: "Prenez des photos de chaque pièce après le ménage et uploadez-les directement depuis la mission.",
    ctaLabel: "Voir l'upload photo",
    ctaRoute: "/prestataire/missions",
    icon: "camera",
  },
  {
    id: "sp-notifications",
    route: "/prestataire",
    title: "Notifications",
    explanation: "Vous recevez une notification à chaque nouvelle mission disponible ou assignée. Vérifiez régulièrement la cloche en haut à droite.",
    useCase: "Activez les notifications pour ne manquer aucune mission et répondre rapidement aux demandes.",
    ctaLabel: "Voir les notifications",
    icon: "bell",
  },
  {
    id: "sp-complete",
    route: "/prestataire",
    title: "Votre espace prestataire est prêt",
    explanation: "Vous avez découvert les fonctionnalités principales de votre espace. Vous pouvez maintenant gérer vos missions en toute autonomie.",
    useCase: "Revenez à la visite à tout moment depuis le menu Aide dans la barre latérale.",
    ctaLabel: "Voir mes missions",
    ctaRoute: "/prestataire/missions",
    icon: "check-circle",
  },
];

export const OWNER_TOUR_STEPS: TourStep[] = [
  {
    id: "owner-dashboard",
    route: "/proprietaire",
    title: "Votre tableau de bord",
    explanation: "Vue d'ensemble de votre logement : taux d'occupation, activité récente et prochaines réservations.",
    useCase: "Consultez votre tableau de bord pour suivre l'activité locative de votre bien en un coup d'œil.",
    ctaLabel: "Explorer le tableau de bord",
    icon: "layout-dashboard",
  },
  {
    id: "owner-property",
    route: "/proprietaire/biens",
    title: "Votre logement",
    explanation: "Consultez les informations détaillées de votre bien : adresse, type, équipements et indicateurs de performance.",
    useCase: "Vérifiez que les informations de votre logement sont à jour pour un suivi optimal.",
    ctaLabel: "Voir mon logement",
    ctaRoute: "/proprietaire/biens",
    icon: "home",
  },
  {
    id: "owner-inspections",
    route: "/proprietaire/etats-des-lieux",
    title: "États des lieux",
    explanation: "Consultez les rapports d'états des lieux d'entrée et de sortie, avec photos et signatures. Téléchargez les PDF pour vos archives.",
    useCase: "Après chaque changement de voyageur, retrouvez ici le rapport détaillé avec les photos.",
    ctaLabel: "Voir les états des lieux",
    ctaRoute: "/proprietaire/etats-des-lieux",
    icon: "clipboard-check",
  },
  {
    id: "owner-cleaning",
    route: "/proprietaire",
    title: "Missions réalisées",
    explanation: "Suivez les interventions réalisées dans votre logement : ménage, maintenance, check-in. Consultez les photos avant/après.",
    useCase: "Vérifiez la qualité des interventions grâce aux photos uploadées par les prestataires.",
    ctaLabel: "Voir l'activité",
    icon: "briefcase",
  },
  {
    id: "owner-documents",
    route: "/proprietaire/finances",
    title: "Documents et factures",
    explanation: "Retrouvez toutes les factures émises par la conciergerie et vos documents importants. Téléchargez-les en PDF.",
    useCase: "Chaque mois, consultez vos factures et téléchargez-les pour votre comptabilité.",
    ctaLabel: "Voir les documents",
    ctaRoute: "/proprietaire/finances",
    icon: "euro",
  },
  {
    id: "owner-complete",
    route: "/proprietaire",
    title: "Votre espace propriétaire est prêt",
    explanation: "Vous pouvez maintenant suivre l'activité de votre logement en toute autonomie. La conciergerie gère tout, vous gardez la visibilité.",
    useCase: "Revenez à la visite à tout moment depuis le menu Aide dans la barre latérale.",
    ctaLabel: "Aller au tableau de bord",
    ctaRoute: "/proprietaire",
    icon: "check-circle",
  },
];

type PortalType = "provider" | "owner";

interface TourState {
  currentStep: number;
  isActive: boolean;
  isPaused: boolean;
  showWelcome: boolean;
}

function getKeys(portal: PortalType) {
  const prefix = portal === "provider" ? "mywelkom_sp" : "mywelkom_owner";
  return {
    state: `${prefix}_tour_state`,
    completed: `${prefix}_tour_completed`,
    seen: `${prefix}_tour_seen`,
  };
}

function getSteps(portal: PortalType): TourStep[] {
  return portal === "provider" ? PROVIDER_TOUR_STEPS : OWNER_TOUR_STEPS;
}

export function usePortalTour(portal: PortalType) {
  const navigate = useNavigate();
  const keys = getKeys(portal);
  const steps = getSteps(portal);

  const [tourState, setTourState] = useState<TourState>(() => {
    const saved = localStorage.getItem(keys.state);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return { currentStep: 0, isActive: false, isPaused: false, showWelcome: false };
  });

  const [tourCompleted, setTourCompleted] = useState(() =>
    localStorage.getItem(keys.completed) === "true"
  );

  useEffect(() => {
    localStorage.setItem(keys.state, JSON.stringify(tourState));
  }, [tourState, keys.state]);

  // Auto-show welcome for first-time users
  useEffect(() => {
    const seen = localStorage.getItem(keys.seen);
    if (!seen && !tourCompleted) {
      const t = setTimeout(() => {
        setTourState({ currentStep: 0, isActive: false, isPaused: false, showWelcome: true });
      }, 1200);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showWelcomeScreen = useCallback(() => {
    setTourState({ currentStep: 0, isActive: false, isPaused: false, showWelcome: true });
  }, []);

  const startTour = useCallback(() => {
    localStorage.setItem(keys.seen, "true");
    const step = steps[0];
    setTourState({ currentStep: 0, isActive: true, isPaused: false, showWelcome: false });
    navigate(step.route);
  }, [navigate, steps, keys.seen]);

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= steps.length) return;
    const step = steps[index];
    setTourState(prev => ({ ...prev, currentStep: index }));
    navigate(step.route);
  }, [navigate, steps]);

  const nextStep = useCallback(() => {
    const next = tourState.currentStep + 1;
    if (next >= steps.length) {
      setTourState({ currentStep: 0, isActive: false, isPaused: false, showWelcome: false });
      setTourCompleted(true);
      localStorage.setItem(keys.completed, "true");
      navigate(steps[0].route);
      return;
    }
    goToStep(next);
  }, [tourState.currentStep, goToStep, navigate, steps, keys.completed]);

  const prevStep = useCallback(() => {
    goToStep(tourState.currentStep - 1);
  }, [tourState.currentStep, goToStep]);

  const skipTour = useCallback(() => {
    localStorage.setItem(keys.seen, "true");
    setTourState({ currentStep: 0, isActive: false, isPaused: false, showWelcome: false });
    setTourCompleted(true);
    localStorage.setItem(keys.completed, "true");
  }, [keys]);

  const pauseTour = useCallback(() => {
    setTourState(prev => ({ ...prev, isActive: false, isPaused: true, showWelcome: false }));
  }, []);

  const resumeTour = useCallback(() => {
    const step = steps[tourState.currentStep];
    setTourState(prev => ({ ...prev, isActive: true, isPaused: false, showWelcome: false }));
    navigate(step.route);
  }, [tourState.currentStep, navigate, steps]);

  const restartTour = useCallback(() => {
    setTourCompleted(false);
    localStorage.removeItem(keys.completed);
    localStorage.removeItem(keys.seen);
    showWelcomeScreen();
  }, [showWelcomeScreen, keys]);

  const currentStep = steps[tourState.currentStep];
  const totalSteps = steps.length;
  const progressPercent = Math.round(((tourState.currentStep + 1) / totalSteps) * 100);

  return {
    isActive: tourState.isActive,
    isPaused: tourState.isPaused,
    showWelcome: tourState.showWelcome,
    currentStepIndex: tourState.currentStep,
    currentStep,
    totalSteps,
    progressPercent,
    tourCompleted,
    steps,
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

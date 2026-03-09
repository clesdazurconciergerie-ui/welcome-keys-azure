import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalTour } from "@/hooks/usePortalTour";
import { PortalTourOverlay } from "./PortalTourOverlay";
import { PortalTourWelcome } from "./PortalTourWelcome";
import { PortalTourMinimized } from "./PortalTourMinimized";
import { GuidedTourComplete } from "./GuidedTourComplete";

interface PortalTourProviderProps {
  portal: "provider" | "owner";
}

export function PortalTourProvider({ portal }: PortalTourProviderProps) {
  const navigate = useNavigate();
  const tour = usePortalTour(portal);
  const [showComplete, setShowComplete] = useState(false);

  const welcomeTitle = portal === "provider"
    ? "Bienvenue dans votre espace prestataire"
    : "Bienvenue dans votre espace propriétaire";

  const welcomeDesc = portal === "provider"
    ? "Découvrons ensemble comment gérer vos missions et interventions."
    : "Découvrons ensemble comment suivre l'activité de votre logement.";

  const homeRoute = portal === "provider" ? "/prestataire" : "/proprietaire";

  const handleStart = useCallback(() => {
    tour.startTour();
  }, [tour]);

  const handleSkipWelcome = useCallback(() => {
    tour.skipTour();
  }, [tour]);

  const handleNext = useCallback(() => {
    const isLast = tour.currentStepIndex === tour.totalSteps - 1;
    if (isLast) {
      tour.skipTour();
      setShowComplete(true);
    } else {
      tour.nextStep();
    }
  }, [tour]);

  const handleAction = useCallback(() => {
    if (tour.currentStep?.ctaRoute) {
      tour.pauseTour();
      navigate(tour.currentStep.ctaRoute);
    }
  }, [tour, navigate]);

  const handleCompleteDashboard = useCallback(() => {
    setShowComplete(false);
    navigate(homeRoute);
  }, [navigate, homeRoute]);

  const handleCompleteRestart = useCallback(() => {
    setShowComplete(false);
    tour.restartTour();
  }, [tour]);

  const handleCompleteContinue = useCallback(() => {
    setShowComplete(false);
    navigate(homeRoute);
  }, [navigate, homeRoute]);

  return (
    <>
      <PortalTourWelcome
        open={tour.showWelcome}
        onStart={handleStart}
        onSkip={handleSkipWelcome}
        title={welcomeTitle}
        description={welcomeDesc}
      />

      {tour.isActive && tour.currentStep && (
        <PortalTourOverlay
          isActive={tour.isActive}
          step={tour.currentStep}
          stepIndex={tour.currentStepIndex}
          totalSteps={tour.totalSteps}
          progressPercent={tour.progressPercent}
          steps={tour.steps}
          onNext={handleNext}
          onPrev={tour.prevStep}
          onSkip={tour.skipTour}
          onPause={tour.pauseTour}
          onAction={handleAction}
          isLastStep={tour.currentStepIndex === tour.totalSteps - 1}
        />
      )}

      <PortalTourMinimized
        visible={tour.isPaused && !tour.isActive && !tour.tourCompleted}
        stepIndex={tour.currentStepIndex}
        totalSteps={tour.totalSteps}
        onResume={tour.resumeTour}
        onClose={tour.skipTour}
      />

      <GuidedTourComplete
        open={showComplete}
        onDashboard={handleCompleteDashboard}
        onRestart={handleCompleteRestart}
        onContinue={handleCompleteContinue}
      />
    </>
  );
}

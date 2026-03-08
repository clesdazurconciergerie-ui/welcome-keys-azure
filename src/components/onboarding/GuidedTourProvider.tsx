import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useGuidedTour } from "@/hooks/useGuidedTour";
import { GuidedTourWelcome } from "./GuidedTourWelcome";
import { GuidedTourOverlay } from "./GuidedTourOverlay";
import { GuidedTourComplete } from "./GuidedTourComplete";

const TOUR_SEEN_KEY = "mywelkom_tour_seen";

export function GuidedTourProvider() {
  const navigate = useNavigate();
  const tour = useGuidedTour();
  const [showComplete, setShowComplete] = useState(false);

  // Auto-show welcome for first-time users
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_SEEN_KEY);
    if (!seen && !tour.tourCompleted) {
      // Small delay so dashboard renders first
      const t = setTimeout(() => tour.showWelcomeScreen(), 1200);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = useCallback(() => {
    localStorage.setItem(TOUR_SEEN_KEY, "true");
    tour.startTour();
  }, [tour]);

  const handleSkipWelcome = useCallback(() => {
    localStorage.setItem(TOUR_SEEN_KEY, "true");
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
    navigate("/dashboard");
  }, [navigate]);

  const handleCompleteRestart = useCallback(() => {
    setShowComplete(false);
    tour.restartTour();
  }, [tour]);

  const handleCompleteContinue = useCallback(() => {
    setShowComplete(false);
    navigate("/dashboard/branding");
  }, [navigate]);

  return (
    <>
      <GuidedTourWelcome
        open={tour.showWelcome}
        onStart={handleStart}
        onSkip={handleSkipWelcome}
      />

      {tour.isActive && tour.currentStep && (
        <GuidedTourOverlay
          isActive={tour.isActive}
          step={tour.currentStep}
          stepIndex={tour.currentStepIndex}
          totalSteps={tour.totalSteps}
          progressPercent={tour.progressPercent}
          onNext={handleNext}
          onPrev={tour.prevStep}
          onSkip={tour.skipTour}
          onPause={tour.pauseTour}
          onAction={handleAction}
          isLastStep={tour.currentStepIndex === tour.totalSteps - 1}
        />
      )}

      <GuidedTourComplete
        open={showComplete}
        onDashboard={handleCompleteDashboard}
        onRestart={handleCompleteRestart}
        onContinue={handleCompleteContinue}
      />
    </>
  );
}

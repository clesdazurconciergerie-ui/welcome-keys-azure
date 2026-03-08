import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OnboardingState {
  hasProperty: boolean;
  hasOwner: boolean;
  hasProvider: boolean;
  hasMission: boolean;
  hasInspection: boolean;
  hasBooklet: boolean;
}

const ONBOARDING_DISMISSED_KEY = "mywelkom_onboarding_dismissed";
const TIPS_DISMISSED_KEY = "mywelkom_tips_dismissed";

export function useOnboarding() {
  const [showWizard, setShowWizard] = useState(false);
  const [progress, setProgress] = useState<OnboardingState>({
    hasProperty: false,
    hasOwner: false,
    hasProvider: false,
    hasMission: false,
    hasInspection: false,
    hasBooklet: false,
  });
  const [loading, setLoading] = useState(true);

  const checkProgress = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [properties, owners, providers, missions, inspections, booklets] = await Promise.all([
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("owners").select("id", { count: "exact", head: true }).eq("concierge_user_id", user.id),
      supabase.from("service_providers").select("id", { count: "exact", head: true }).eq("concierge_user_id", user.id),
      supabase.from("missions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("inspections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("booklets").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "published"),
    ]);

    const state: OnboardingState = {
      hasProperty: (properties.count || 0) > 0,
      hasOwner: (owners.count || 0) > 0,
      hasProvider: (providers.count || 0) > 0,
      hasMission: (missions.count || 0) > 0,
      hasInspection: (inspections.count || 0) > 0,
      hasBooklet: (booklets.count || 0) > 0,
    };

    setProgress(state);

    // Show wizard if nothing is set up and not dismissed
    const dismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY);
    if (!dismissed && !state.hasProperty && !state.hasOwner && !state.hasProvider) {
      setShowWizard(true);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  const dismissWizard = () => {
    setShowWizard(false);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
  };

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalSteps = 6;
  const completionPercent = Math.round((completedCount / totalSteps) * 100);
  const isFullyComplete = completedCount === totalSteps;

  // Tips
  const isTipDismissed = (tipId: string) => {
    const dismissed = JSON.parse(localStorage.getItem(TIPS_DISMISSED_KEY) || "[]");
    return dismissed.includes(tipId);
  };

  const dismissTip = (tipId: string) => {
    const dismissed = JSON.parse(localStorage.getItem(TIPS_DISMISSED_KEY) || "[]");
    if (!dismissed.includes(tipId)) {
      localStorage.setItem(TIPS_DISMISSED_KEY, JSON.stringify([...dismissed, tipId]));
    }
  };

  return {
    showWizard,
    setShowWizard,
    dismissWizard,
    progress,
    loading,
    completedCount,
    totalSteps,
    completionPercent,
    isFullyComplete,
    isTipDismissed,
    dismissTip,
    refetch: checkProgress,
  };
}

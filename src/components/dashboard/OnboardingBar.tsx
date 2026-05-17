import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Check, Circle, Home, CalendarSync, BookOpen, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

type StepKey = "logement" | "ical" | "livret" | "prestataire";

type StepDef = {
  key: StepKey;
  label: string;
  to: string;
  icon: typeof Home;
};

const STEPS: StepDef[] = [
  { key: "logement", label: "Ajouter un logement", to: "/dashboard/properties", icon: Home },
  { key: "ical", label: "Connecter un calendrier iCal", to: "/dashboard/channel-manager", icon: CalendarSync },
  { key: "livret", label: "Créer un livret voyageur", to: "/dashboard/livrets", icon: BookOpen },
  { key: "prestataire", label: "Inviter un prestataire", to: "/dashboard/prestataires", icon: Users },
];

export function OnboardingBar() {
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<StepKey, boolean>>({
    logement: false, ical: false, livret: false, prestataire: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const uid = session.user.id;
      if (!mounted) return;
      setUserId(uid);

      const { data: userRow } = await supabase
        .from("users")
        .select("created_at, onboarding_completed, onboarding_completed_at, onboarding_steps")
        .eq("id", uid)
        .maybeSingle();

      if (userRow) {
        setCreatedAt(userRow.created_at);
        setCompleted(!!userRow.onboarding_completed);
        setCompletedAt(userRow.onboarding_completed_at);
      }

      const [props, icals, booklets, providers] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("ical_calendars").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("booklets").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("service_providers").select("id", { count: "exact", head: true }).eq("concierge_user_id", uid),
      ]);

      const next: Record<StepKey, boolean> = {
        logement: (props.count ?? 0) > 0,
        ical: (icals.count ?? 0) > 0,
        livret: (booklets.count ?? 0) > 0,
        prestataire: (providers.count ?? 0) > 0,
      };
      if (!mounted) return;
      setSteps(next);

      const allDone = Object.values(next).every(Boolean);
      const prev = (userRow?.onboarding_steps ?? {}) as Record<string, boolean>;
      const changed = STEPS.some(s => prev[s.key] !== next[s.key]);

      const updates: Record<string, unknown> = {};
      if (changed) updates.onboarding_steps = next;
      if (allDone && !userRow?.onboarding_completed_at) {
        updates.onboarding_completed_at = new Date().toISOString();
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("users").update(updates).eq("id", uid);
        if (updates.onboarding_completed_at) {
          setCompletedAt(updates.onboarding_completed_at as string);
        }
      }

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const doneCount = useMemo(() => Object.values(steps).filter(Boolean).length, [steps]);
  const allDone = doneCount === STEPS.length;

  const shouldShow = useMemo(() => {
    if (loading || hidden || !userId || !createdAt) return false;
    if (completed) return false;
    const accountAgeDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
    if (accountAgeDays >= 7 && !allDone) return false;
    if (allDone) {
      if (!completedAt) return true;
      const sinceCompletionDays = (Date.now() - new Date(completedAt).getTime()) / 86_400_000;
      return sinceCompletionDays < 3;
    }
    return true;
  }, [loading, hidden, userId, createdAt, completed, completedAt, allDone]);

  const handleHide = async () => {
    setHidden(true);
    if (userId) {
      await supabase.from("users").update({ onboarding_completed: true }).eq("id", userId);
    }
  };

  if (!shouldShow) return null;

  const progress = (doneCount / STEPS.length) * 100;

  return (
    <div className="border-b border-border bg-card/60">
      <div className="px-5 md:px-8 py-4 relative">
        <button
          onClick={handleHide}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Masquer"
        >
          <X className="h-4 w-4" />
        </button>

        {allDone ? (
          <div className="pr-8">
            <p className="text-sm font-semibold text-foreground">
              🎉 Votre espace est configuré !
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tout est prêt. Vous pouvez masquer ce bandeau à tout moment.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pr-8 mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Configurez votre espace — {doneCount}/{STEPS.length} étapes complétées
              </h2>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            <ul className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {STEPS.map((s) => {
                const done = steps[s.key];
                const Icon = s.icon;
                const content = (
                  <div className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    done
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-border bg-background hover:bg-muted/40"
                  )}>
                    <div className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                      done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {done ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{s.label}</p>
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
                return (
                  <li key={s.key}>
                    {done ? content : <Link to={s.to}>{content}</Link>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default OnboardingBar;

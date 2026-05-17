import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsServiceProvider } from "@/hooks/useIsServiceProvider";
import {
  canUseServiceWorker,
  getNotificationPermission,
  registerServiceWorker,
  requestNotificationPermission,
} from "@/lib/pwa";
import { useToast } from "@/hooks/use-toast";

const DISMISS_KEY = "welkom-sp-push-banner-dismissed";

interface Props {
  variant?: "banner" | "card";
}

export function PushOptIn({ variant = "banner" }: Props) {
  const { spId, isServiceProvider } = useIsServiceProvider();
  const { toast } = useToast();
  const [permission, setPermission] = useState(getNotificationPermission());
  const [dismissed, setDismissed] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  if (permission === "unsupported") return null;
  if (!isServiceProvider) return null;
  if (variant === "banner" && (dismissed || permission === "granted")) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      await registerServiceWorker();
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === "granted") {
        const token = `local-${crypto.randomUUID()}`;
        if (spId) {
          await (supabase as any)
            .from("service_providers")
            .update({ push_token: token, push_enabled: true })
            .eq("id", spId);
        }
        toast({
          title: "Notifications activées",
          description: "Vous serez prévenu(e) dès qu'une mission est disponible.",
        });
      } else if (result === "denied") {
        toast({
          title: "Notifications refusées",
          description: "Vous pouvez les réactiver dans les réglages du navigateur.",
          variant: "destructive",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (variant === "card") {
    const granted = permission === "granted";
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {granted ? (
            <Bell className="w-5 h-5 text-primary" />
          ) : (
            <BellOff className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">
            {granted ? "Notifications activées" : "Notifications désactivées"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {granted
              ? "Vous recevez une alerte pour chaque nouvelle mission disponible."
              : "Activez les notifications pour ne manquer aucune mission."}
          </p>
          {!granted && (
            <Button
              size="sm"
              className="mt-3 bg-[#061452] hover:bg-[#061452]/90"
              onClick={handleEnable}
              disabled={busy || permission === "denied"}
            >
              {permission === "denied" ? "Bloquées par le navigateur" : "Activer"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#061452] text-white px-4 py-3 flex items-center gap-3 shadow-sm">
      <Bell className="w-5 h-5 flex-shrink-0" />
      <p className="text-sm flex-1 min-w-0">
        Activez les notifications pour ne manquer aucune mission.
      </p>
      <Button
        size="sm"
        variant="secondary"
        onClick={handleEnable}
        disabled={busy}
        className="bg-[#C4A45B] hover:bg-[#C4A45B]/90 text-[#061452] border-0"
      >
        Activer
      </Button>
      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-white/10 rounded"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

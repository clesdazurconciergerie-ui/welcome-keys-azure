import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation, Camera, CheckCircle, Loader2, Calendar, Clock, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useNewMissions } from "@/hooks/useNewMissions";
import { useChecklistItems } from "@/hooks/useMissions";
import { useIsServiceProvider } from "@/hooks/useIsServiceProvider";
import { PhotoGuide } from "@/components/mission/PhotoGuide";

const statusBadge: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 border-emerald-300",
  assigned: "bg-blue-100 text-blue-700 border-blue-300",
  confirmed: "bg-blue-100 text-blue-700 border-blue-300",
  in_progress: "bg-amber-100 text-amber-800 border-amber-300",
  done: "bg-muted text-muted-foreground border-border",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-300",
};

const statusLabel: Record<string, string> = {
  open: "Ouverte",
  assigned: "Acceptée",
  confirmed: "Confirmée",
  in_progress: "En cours",
  done: "Terminée",
  approved: "Approuvée",
};

const missionTypeLabel: Record<string, string> = {
  cleaning: "Ménage",
  cleaning_checkout: "Ménage (check-out)",
  checkin: "Check-in",
  checkout: "Check-out",
  maintenance: "Maintenance",
};

export default function SPMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { missions, isLoading, markDone, refetch } = useNewMissions("provider");
  const { spId } = useIsServiceProvider();

  const mission = useMemo(() => missions.find((m) => m.id === id) ?? null, [missions, id]);
  const { items: checklistItems } = useChecklistItems(mission?.property_id);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [photosReady, setPhotosReady] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !mission && id) {
      // Mission not in list, refetch in case it just changed
      refetch();
    }
  }, [isLoading, mission, id, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/prestataire/missions")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Retour
        </Button>
        <div className="mt-8 text-center text-muted-foreground">Mission introuvable.</div>
      </div>
    );
  }

  const address = mission.property?.address ?? "";
  const propertyName = mission.property?.name ?? "Logement";
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${propertyName} ${address}`.trim()
  )}`;

  const mandatoryItems = checklistItems.filter((i) => i.is_mandatory);
  const allMandatoryChecked =
    mandatoryItems.length === 0 || mandatoryItems.every((i) => checked[i.id]);
  const canComplete =
    mission.status === "assigned" || mission.status === "confirmed" || mission.status === "in_progress";
  const completionEnabled = canComplete && photosReady && allMandatoryChecked && !completing;

  const dateFmt = new Date(mission.start_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeFmt = new Date(mission.start_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const durationMin = mission.duration_minutes ?? 120;
  const durationFmt =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? String(durationMin % 60).padStart(2, "0") : ""}`
      : `${durationMin}min`;

  const handleComplete = async () => {
    setCompleting(true);
    await markDone(mission.id);
    setCompleting(false);
    navigate("/prestataire/missions");
  };

  const statusKey = mission.status;
  const badgeClass = statusBadge[statusKey] ?? "bg-muted text-muted-foreground border-border";
  const badgeText = statusLabel[statusKey] ?? statusKey;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky header with back + status badge */}
      <header className="sticky top-0 z-30 bg-card border-b border-border flex items-center justify-between px-3 py-3 min-h-[56px]">
        <button
          onClick={() => navigate("/prestataire/missions")}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground h-11 px-2 -ml-2 rounded-lg active:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" /> Missions
        </button>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badgeClass}`}
        >
          {badgeText}
        </span>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Title + key facts */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {missionTypeLabel[mission.mission_type] ?? mission.mission_type}
          </p>
          <h1 className="text-xl font-bold text-foreground mt-1 leading-tight">{mission.title}</h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-foreground flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "#061452", fontSize: 20 }}>
              <Calendar className="w-5 h-5" /> {dateFmt} · {timeFmt}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" /> {durationFmt}
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
              <Euro className="w-4 h-4" /> {mission.payout_amount} €
            </span>
          </div>
        </div>

        {/* Section 1: Address */}
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Adresse</h2>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="font-medium text-foreground">{propertyName}</p>
            {address && (
              <p className="text-sm text-muted-foreground mt-0.5 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" /> {address}
              </p>
            )}
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-[#061452] text-white text-sm font-semibold active:opacity-90"
            >
              <Navigation className="w-4 h-4" /> Itinéraire Google Maps
            </a>
          </div>
        </section>

        {/* Instructions */}
        {mission.instructions && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">Instructions</h2>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground whitespace-pre-wrap">
              {mission.instructions}
            </div>
          </section>
        )}

        {/* Section 2: Checklist */}
        {checklistItems.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">Checklist</h2>
            <ul className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border shadow-sm">
              {checklistItems.map((item) => (
                <li key={item.id}>
                  <label className="flex items-center gap-3 px-3 min-h-[48px] active:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={!!checked[item.id]}
                      onCheckedChange={(c) =>
                        setChecked((p) => ({ ...p, [item.id]: !!c }))
                      }
                      className="h-5 w-5"
                    />
                    <span className="text-sm flex-1 text-foreground">{item.task_text}</span>
                    {item.is_mandatory && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                        Obligatoire
                      </span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Section 3: Photo guide */}
        {spId && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Camera className="w-4 h-4" /> Photos guidées
            </h2>
            <PhotoGuide
              missionId={mission.id}
              propertyId={mission.property_id}
              userId={mission.user_id}
              providerId={spId}
              readOnly={["done", "approved"].includes(mission.status)}
              onProgressChange={setPhotosReady}
            />
          </section>
        )}
      </div>

      {/* Sticky bottom action */}
      {canComplete && !["done", "approved"].includes(mission.status) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <Button
            onClick={handleComplete}
            disabled={!completionEnabled}
            className="w-full text-white font-semibold rounded-lg"
            style={{ backgroundColor: completionEnabled ? "#061452" : undefined, height: 56, fontSize: 16 }}
          >
            {completing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" /> Terminer la mission
              </>
            )}
          </Button>
          {!photosReady && (
            <p className="text-[11px] text-center text-muted-foreground mt-1.5">
              Ajoutez toutes les photos obligatoires pour terminer.
            </p>
          )}
          {photosReady && !allMandatoryChecked && (
            <p className="text-[11px] text-center text-muted-foreground mt-1.5">
              Cochez toutes les étapes obligatoires de la checklist.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

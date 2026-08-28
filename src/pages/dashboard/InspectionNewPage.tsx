// MODULE — Écran de démarrage d'un état des lieux (bien → réservation → type)
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, Check, DoorOpen, DoorClosed, Home, CalendarDays, Loader2 } from "lucide-react";
import { usePropertyInspections } from "@/hooks/usePropertyInspections";
import { INSPECTION_ZONES } from "@/lib/inspection-zones";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

export default function InspectionNewPage() {
  const navigate = useNavigate();
  const { create } = usePropertyInspections();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [type, setType] = useState<"entry" | "exit" | null>(null);
  const [starting, setStarting] = useState(false);

  const properties = useQuery({
    queryKey: ["inspection-new-properties"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("properties").select("id, name, address, city")
        .eq("user_id", user.id).order("name");
      return data ?? [];
    },
  });

  const bookings = useQuery({
    queryKey: ["inspection-new-bookings", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
      const { data } = await (supabase as any)
        .from("bookings")
        .select("id, check_in, check_out, guest_name, source")
        .eq("property_id", propertyId)
        .gte("check_out", from)
        .order("check_in");
      return data ?? [];
    },
  });

  useEffect(() => { setBookingId(null); }, [propertyId]);

  const selectedBooking = useMemo(
    () => (bookings.data ?? []).find((b: any) => b.id === bookingId),
    [bookings.data, bookingId],
  );

  const canStart = !!propertyId && !!type;

  const start = async () => {
    if (!canStart) return;
    setStarting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const today = new Date().toISOString().slice(0, 10);
      const inserted: any = await create.mutateAsync({
        property_id: propertyId!,
        official_date: type === "exit" && selectedBooking ? selectedBooking.check_out : today,
        inspection_type: type!,
        booking_id: bookingId,
        guest_name: selectedBooking?.guest_name ?? null,
      });
      // Pré-crée les zones du parcours
      await (supabase as any).from("inspection_zones").insert(
        INSPECTION_ZONES.map((z, i) => ({
          inspection_id: inserted.id,
          user_id: user!.id,
          zone_key: z.key,
          zone_label: z.label,
          status: "pending",
          display_order: i,
        })),
      );
      navigate(`/dashboard/etats-des-lieux/${inserted.id}/remplir`);
    } catch (e: any) {
      toast.error(e.message ?? "Impossible de démarrer");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] pb-32">
      <SEOHead title="Nouvel état des lieux — Welkom" description="Démarrer un état des lieux d'entrée ou de sortie" />

      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/etats-des-lieux")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-base font-semibold tracking-tight">Nouvel état des lieux</h1>
          <p className="text-xs text-muted-foreground">3 choix, puis on démarre</p>
        </div>
      </header>

      <div className="px-4 py-6 space-y-8 max-w-2xl mx-auto">
        {/* 1 — Bien */}
        <section className="space-y-3">
          <StepTitle n={1} label="Choisir le bien" done={!!propertyId} />
          {properties.isLoading ? (
            <Skeleton className="h-16" />
          ) : (properties.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bien enregistré.</p>
          ) : (
            <div className="grid gap-2">
              {(properties.data ?? []).map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPropertyId(p.id)}
                  className={`w-full text-left border px-4 py-4 min-h-[56px] transition-colors ${
                    propertyId === p.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Home className="h-4 w-4 shrink-0" strokeWidth={1.5} /> {p.name}
                  </span>
                  {(p.address || p.city) && (
                    <span className="block text-xs opacity-70 mt-0.5 truncate">{[p.address, p.city].filter(Boolean).join(", ")}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 2 — Réservation */}
        {propertyId && (
          <section className="space-y-3">
            <StepTitle n={2} label="Réservation concernée" done={!!bookingId} optional />
            {bookings.isLoading ? (
              <Skeleton className="h-16" />
            ) : (bookings.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune réservation en cours ou à venir — vous pouvez continuer sans.</p>
            ) : (
              <div className="grid gap-2">
                {(bookings.data ?? []).map((b: any) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBookingId(bookingId === b.id ? null : b.id)}
                    className={`w-full text-left border px-4 py-4 min-h-[56px] transition-colors ${
                      bookingId === b.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      {new Date(b.check_in).toLocaleDateString("fr-FR")} → {new Date(b.check_out).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="block text-xs opacity-70 mt-0.5">
                      {b.guest_name ?? "Voyageur non renseigné"}{b.source ? ` · ${b.source}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 3 — Type */}
        {propertyId && (
          <section className="space-y-3">
            <StepTitle n={3} label="Type de contrôle" done={!!type} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <TypeButton
                active={type === "entry"} onClick={() => setType("entry")}
                icon={<DoorOpen className="h-5 w-5" strokeWidth={1.5} />}
                title="État des lieux d'entrée" desc="À l'arrivée du voyageur"
              />
              <TypeButton
                active={type === "exit"} onClick={() => setType("exit")}
                icon={<DoorClosed className="h-5 w-5" strokeWidth={1.5} />}
                title="État des lieux de sortie" desc="Au départ du voyageur"
              />
            </div>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto">
          <Button className="w-full h-14 text-base" disabled={!canStart || starting} onClick={start}>
            {starting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Lancer le contrôle <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ n, label, done, optional }: { n: number; label: string; done?: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-6 w-6 flex items-center justify-center text-xs border ${done ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <h2 className="text-sm font-medium uppercase tracking-wider">{label}</h2>
      {optional && <span className="text-[11px] text-muted-foreground">(facultatif)</span>}
    </div>
  );
}

function TypeButton({ active, onClick, icon, title, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      type="button" onClick={onClick}
      className={`border px-4 py-5 min-h-[72px] text-left transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/40"
      }`}
    >
      <span className="flex items-center gap-2 font-medium">{icon}{title}</span>
      <span className="block text-xs opacity-70 mt-1">{desc}</span>
    </button>
  );
}

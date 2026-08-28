// MODULE — Écran de démarrage d'un état des lieux (bien → réservation → type)
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ArrowRight, Check, ChevronRight, DoorOpen, DoorClosed, Home, CalendarDays, Loader2, Search } from "lucide-react";
import { usePropertyInspections } from "@/hooks/usePropertyInspections";
import { INSPECTION_ZONES } from "@/lib/inspection-zones";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

const STEPS = [
  { n: 1, short: "Bien", label: "Choisir le bien" },
  { n: 2, short: "Réservation", label: "Réservation concernée" },
  { n: 3, short: "Contrôle", label: "Type de contrôle" },
];

export default function InspectionNewPage() {
  const navigate = useNavigate();
  const { create } = usePropertyInspections();
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [type, setType] = useState<"entry" | "exit" | null>(null);
  const [starting, setStarting] = useState(false);
  const [query, setQuery] = useState("");

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

  const filteredProperties = useMemo(() => {
    const all = (properties.data ?? []) as any[];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) =>
      [p.name, p.address, p.city].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [properties.data, query]);

  const currentStep = !propertyId ? 1 : !type ? 2 : 3;
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

  const continueButton = (
    <div>
      <Button
        className="w-full h-12 md:h-13 text-base transition-all duration-200"
        disabled={!canStart || starting}
        onClick={start}
      >
        {starting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
        Continuer <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
      {!canStart && (
        <p className="text-xs text-muted-foreground text-center mt-2" aria-live="polite">
          {!propertyId ? "Sélectionnez un logement pour continuer." : "Choisissez le type de contrôle pour continuer."}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] pb-28 md:pb-12">
      <SEOHead title="Nouvel état des lieux — Welkom" description="Démarrer un état des lieux d'entrée ou de sortie" />

      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Retour" onClick={() => navigate("/dashboard/etats-des-lieux")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight">Nouvel état des lieux</h1>
          <p className="text-xs text-muted-foreground truncate">Sélectionnez le logement à contrôler.</p>
        </div>
      </header>

      <div className="px-4 md:px-6 py-6 w-full max-w-[820px] mx-auto space-y-8">
        {/* Stepper */}
        <nav aria-label="Étapes" className="flex items-center gap-2 md:gap-3">
          {STEPS.map((s, i) => {
            const state = s.n < currentStep ? "done" : s.n === currentStep ? "active" : "todo";
            return (
              <div key={s.n} className="flex items-center gap-2 md:gap-3 min-w-0">
                {i > 0 && <span className="hidden sm:block h-px w-6 md:w-10 bg-border" aria-hidden />}
                <span
                  className={`flex items-center gap-1.5 text-xs md:text-sm transition-colors duration-200 ${
                    state === "active" ? "text-foreground font-medium" : state === "done" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-6 w-6 shrink-0 flex items-center justify-center text-[11px] border transition-colors duration-200 ${
                      state === "active"
                        ? "bg-foreground text-background border-foreground"
                        : state === "done"
                          ? "border-foreground text-foreground"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {state === "done" ? <Check className="h-3.5 w-3.5" /> : s.n}
                  </span>
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline truncate">{s.label}</span>
                </span>
                {i < STEPS.length - 1 && <span className="sm:hidden text-muted-foreground/50" aria-hidden>•</span>}
              </div>
            );
          })}
        </nav>

        {/* 1 — Bien */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
            Choisir le bien
            {propertyId && <Check className="h-4 w-4" aria-label="Sélectionné" />}
          </h2>

          {properties.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-[88px]" />
              <Skeleton className="h-[88px]" />
            </div>
          ) : (properties.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bien enregistré.</p>
          ) : (
            <>
              {(properties.data ?? []).length > 3 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un bien"
                    aria-label="Rechercher un bien"
                    className="w-full h-11 pl-9 pr-3 border border-border bg-background text-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 transition-shadow"
                  />
                </div>
              )}
              <div className="grid gap-3" role="radiogroup" aria-label="Logements">
                {filteredProperties.map((p: any) => {
                  const selected = propertyId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPropertyId(p.id)}
                      className={`w-full text-left border px-4 py-3 min-h-16 md:min-h-[88px] flex items-center gap-3 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 ${
                        selected
                          ? "border-foreground border-2 bg-foreground/[0.04]"
                          : "border-border hover:border-foreground/50 hover:bg-foreground/[0.02]"
                      }`}
                    >
                      <span className={`h-10 w-10 shrink-0 flex items-center justify-center border transition-colors duration-200 ${
                        selected ? "border-foreground text-foreground" : "border-border text-muted-foreground"
                      }`}>
                        <Home className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{p.name}</span>
                        {(p.address || p.city) && (
                          <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                            {[p.address, p.city].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </span>
                      <span className={`h-5 w-5 shrink-0 flex items-center justify-center border transition-all duration-200 ${
                        selected ? "bg-foreground border-foreground text-background" : "border-border text-transparent"
                      }`} aria-hidden>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-colors duration-200 ${selected ? "text-foreground" : "text-muted-foreground/40"}`} strokeWidth={1.5} aria-hidden />
                    </button>
                  );
                })}
                {filteredProperties.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucun bien ne correspond à « {query} ».</p>
                )}
              </div>

              {/* Action sous la liste — desktop */}
              <div className="hidden md:block pt-2">{continueButton}</div>
            </>
          )}
        </section>

        {/* 2 — Réservation */}
        {propertyId && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
              Réservation concernée
              <span className="text-[11px] text-muted-foreground normal-case tracking-normal">(facultatif)</span>
            </h2>
            {bookings.isLoading ? (
              <Skeleton className="h-[88px]" />
            ) : (bookings.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune réservation en cours ou à venir — vous pouvez continuer sans.</p>
            ) : (
              <div className="grid gap-3" role="radiogroup" aria-label="Réservations">
                {(bookings.data ?? []).map((b: any) => {
                  const selected = bookingId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setBookingId(selected ? null : b.id)}
                      className={`w-full text-left border px-4 py-3 min-h-16 flex items-center gap-3 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 ${
                        selected
                          ? "border-foreground border-2 bg-foreground/[0.04]"
                          : "border-border hover:border-foreground/50 hover:bg-foreground/[0.02]"
                      }`}
                    >
                      <span className={`h-10 w-10 shrink-0 flex items-center justify-center border transition-colors duration-200 ${
                        selected ? "border-foreground text-foreground" : "border-border text-muted-foreground"
                      }`}>
                        <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium">
                          {new Date(b.check_in).toLocaleDateString("fr-FR")} → {new Date(b.check_out).toLocaleDateString("fr-FR")}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                          {b.guest_name ?? "Voyageur non renseigné"}{b.source ? ` · ${b.source}` : ""}
                        </span>
                      </span>
                      <span className={`h-5 w-5 shrink-0 flex items-center justify-center border transition-all duration-200 ${
                        selected ? "bg-foreground border-foreground text-background" : "border-border text-transparent"
                      }`} aria-hidden>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 3 — Type */}
        {propertyId && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
              Type de contrôle
              {type && <Check className="h-4 w-4" aria-label="Sélectionné" />}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Rappel de l'action sur desktop quand le type est visible */}
            <div className="hidden md:block pt-2">{continueButton}</div>
          </section>
        )}
      </div>

      {/* Bouton fixe en bas — mobile uniquement */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {continueButton}
      </div>
    </div>
  );
}

function TypeButton({ active, onClick, icon, title, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`border px-4 py-4 min-h-[72px] text-left flex items-start gap-3 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 ${
        active
          ? "border-foreground border-2 bg-foreground/[0.04]"
          : "border-border hover:border-foreground/50 hover:bg-foreground/[0.02]"
      }`}
    >
      <span className={`h-10 w-10 shrink-0 flex items-center justify-center border transition-colors duration-200 ${
        active ? "border-foreground text-foreground" : "border-border text-muted-foreground"
      }`}>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
      </span>
      <span className={`h-5 w-5 shrink-0 flex items-center justify-center border transition-all duration-200 ${
        active ? "bg-foreground border-foreground text-background" : "border-border text-transparent"
      }`} aria-hidden>
        <Check className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BookOpen, KeyRound, Loader2, MapPin, Navigation, PackageCheck, RefreshCw } from "lucide-react";

interface StaffPayload {
  mode: "staff";
  keySet: {
    id: string;
    code: string;
    name: string;
    role: string;
    expectedItems: Array<{ label: string; quantity: number }>;
    status: string;
    holderType: string;
    holderLabel: string | null;
    dueBackAt: string | null;
  };
  property: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    postcode: string | null;
    country: string | null;
  } | null;
  mapsUrl: string | null;
}

interface GuestPayload {
  mode: "guest";
  bookletCode?: string | null;
  unavailable?: boolean;
}

type Payload = StaffPayload | GuestPayload;

export default function KeyTagLandingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke("resolve-key-tag", {
      body: { token },
    });
    if (invokeError || data?.error) {
      setError(data?.error || "Cette puce NFC n'est pas reconnue.");
      setLoading(false);
      return;
    }
    setPayload(data as Payload);
    setLoading(false);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (payload?.mode === "guest" && payload.bookletCode) {
      navigate(`/view/${payload.bookletCode}`, { replace: true });
    }
  }, [payload, navigate]);

  const staffPayload = payload?.mode === "staff" ? payload : null;
  const fullAddress = useMemo(() => {
    if (!staffPayload?.property) return "";
    return [staffPayload.property.address, staffPayload.property.postcode, staffPayload.property.city, staffPayload.property.country]
      .filter(Boolean)
      .join(", ");
  }, [staffPayload]);
  const mapsUrl = staffPayload?.mapsUrl || (fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : "");

  if (loading || (payload?.mode === "guest" && payload.bookletCode)) {
    return (
      <main className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4" aria-live="polite">
          <Loader2 className="h-9 w-9 animate-spin mx-auto text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">Lecture de la pochette…</p>
            <p className="text-sm text-muted-foreground">Ouverture de votre espace adapté.</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-dvh bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" aria-hidden="true" />
            <CardTitle>Puce NFC non reconnue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => void load()} className="min-h-11 w-full">
              <RefreshCw className="h-4 w-4 mr-2" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (payload?.mode === "guest") {
    return (
      <main className="min-h-dvh bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <BookOpen className="h-10 w-10 text-primary mx-auto" aria-hidden="true" />
            <CardTitle>Livret d'accueil indisponible</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Cette pochette est bien enregistrée, mais aucun livret publié n'y est encore associé.
            </p>
            <p className="text-sm font-medium">Contactez Azure Keys Properties pour obtenir les informations d'arrivée.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!staffPayload) return null;

  return (
    <main className="min-h-dvh bg-muted/30 p-4 sm:p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center gap-3 py-2">
          <div className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Azure Keys Properties</p>
            <h1 className="text-xl font-bold">{staffPayload.keySet.name}</h1>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-mono text-lg">{staffPayload.keySet.code}</CardTitle>
              <Badge variant={staffPayload.keySet.status === "missing" ? "destructive" : "secondary"}>
                {staffPayload.keySet.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <section aria-labelledby="property-heading">
              <h2 id="property-heading" className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {staffPayload.property?.name || "Logement"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{fullAddress || "Adresse non renseignée"}</p>
              {mapsUrl && (
                <Button asChild className="mt-3 min-h-11 w-full sm:w-auto">
                  <a href={mapsUrl} target="_blank" rel="noreferrer">
                    <Navigation className="h-4 w-4 mr-2" /> Ouvrir l'itinéraire GPS
                  </a>
                </Button>
              )}
            </section>

            <section className="border-t pt-4" aria-labelledby="contents-heading">
              <h2 id="contents-heading" className="text-sm font-semibold flex items-center gap-2">
                <PackageCheck className="h-4 w-4" /> Contenu attendu
              </h2>
              <ul className="mt-2 space-y-2">
                {staffPayload.keySet.expectedItems?.map((item, index) => (
                  <li key={`${item.label}-${index}`} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                    <span>{item.label}</span><strong>×{item.quantity}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t pt-4 text-sm">
              <p className="text-muted-foreground">Détenteur actuel</p>
              <p className="font-semibold">{staffPayload.keySet.holderLabel || staffPayload.keySet.holderType}</p>
              {staffPayload.keySet.dueBackAt && (
                <p className="text-muted-foreground mt-1">Retour prévu le {new Date(staffPayload.keySet.dueBackAt).toLocaleString("fr-FR")}</p>
              )}
            </section>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full min-h-11" onClick={() => navigate("/dashboard/smart-keys")}>Gérer les pochettes</Button>
      </div>
    </main>
  );
}

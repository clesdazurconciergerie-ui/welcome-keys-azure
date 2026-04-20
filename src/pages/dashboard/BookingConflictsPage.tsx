// MODULE 2 — Page Conflits de réservation
import { useBookingConflicts } from "@/hooks/useBookingConflicts";
import { useProperties } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ShieldCheck, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function BookingConflictsPage() {
  const { conflicts, openConflicts, isLoading, resolve } = useBookingConflicts();
  const { properties } = useProperties();
  const propertyName = (id: string) => properties?.find((p) => p.id === id)?.name ?? "Bien inconnu";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Détecteur de double-réservation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Surveillance automatique des chevauchements iCal entre plateformes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{openConflicts.length}</p>
              <p className="text-xs text-muted-foreground">Conflits ouverts</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{conflicts.filter(c => c.status === "resolved").length}</p>
              <p className="text-xs text-muted-foreground">Résolus</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{conflicts.length}</p>
              <p className="text-xs text-muted-foreground">Total détectés</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conflits actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : openConflicts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold">Aucun conflit détecté</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tous vos calendriers sont synchronisés et sans chevauchement.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {openConflicts.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 bg-destructive/5 border-destructive/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">Double-booking</Badge>
                        <span className="font-semibold">{propertyName(c.property_id)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Chevauchement du{" "}
                        <strong>{format(new Date(c.overlap_start), "d MMM yyyy", { locale: fr })}</strong>{" "}
                        au{" "}
                        <strong>{format(new Date(c.overlap_end), "d MMM yyyy", { locale: fr })}</strong>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => resolve({ id: c.id, status: "ignored" })}>
                        Ignorer
                      </Button>
                      <Button size="sm" onClick={() => resolve({ id: c.id, status: "resolved" })}>
                        Marquer résolu
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

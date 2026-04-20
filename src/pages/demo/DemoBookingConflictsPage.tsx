// MODULE 2 — Version démo (mock data)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ShieldCheck, Calendar } from "lucide-react";

const MOCK_CONFLICTS = [
  { id: "1", property: "Villa Azur — Cannes", platforms: "Airbnb ↔ Booking.com", overlap: "12 — 15 août 2025", severity: "high" },
  { id: "2", property: "Loft Marina — Nice", platforms: "Airbnb ↔ VRBO", overlap: "3 — 5 sept 2025", severity: "high" },
];

export default function DemoBookingConflictsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Détecteur de double-réservation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Surveillance automatique des chevauchements iCal entre plateformes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">2</p><p className="text-xs text-muted-foreground">Conflits ouverts</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">14</p><p className="text-xs text-muted-foreground">Résolus</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">16</p><p className="text-xs text-muted-foreground">Total détectés</p></div>
        </div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Conflits actifs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_CONFLICTS.map((c) => (
              <div key={c.id} className="border rounded-lg p-4 bg-destructive/5 border-destructive/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="destructive">Double-booking</Badge>
                      <span className="font-semibold">{c.property}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.platforms} • Chevauchement {c.overlap}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Ignorer</Button>
                    <Button size="sm">Marquer résolu</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

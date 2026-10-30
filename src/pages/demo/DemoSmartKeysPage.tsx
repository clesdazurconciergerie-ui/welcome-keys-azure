// MODULE 4 — Version démo
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Plus, Battery, Lock, Smartphone } from "lucide-react";

const MOCK_LOCKS = [
  { name: "Porte d'entrée Villa Azur", property: "Villa Azur — Cannes", battery: 87 },
  { name: "Studio Marina", property: "Loft Marina — Nice", battery: 62 },
];

const MOCK_CODES = [
  { pin: "847291", guest: "Marie Dubois", validity: "12 août 16h → 15 août 11h", status: "active" },
  { pin: "203487", guest: "John Smith", validity: "10 août 15h → 12 août 10h", status: "expired" },
];

export default function DemoSmartKeysPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Smart Keys — Serrures connectées
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Igloohome, Nuki, TTLock — codes générés par réservation.
          </p>
        </div>
        <Button><Plus className="h-4 w-4 mr-1" /> Ajouter serrure</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10"><Lock className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">2</p><p className="text-xs text-muted-foreground">Serrures</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10"><KeyRound className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-2xl font-bold">5</p><p className="text-xs text-muted-foreground">Codes actifs</p></div>
        </div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500/10"><Smartphone className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-2xl font-bold">1</p><p className="text-xs text-muted-foreground">Comptes connectés</p></div>
        </div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Mes serrures</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_LOCKS.map((l, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{l.name}</span>
                    <Badge variant="outline" className="gap-1"><Battery className="h-3 w-3" /> {l.battery}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{l.property}</p>
                </div>
                <Button size="sm" variant="outline">Générer code</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Codes récents</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_CODES.map((c, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-lg font-bold">{c.pin}</code>
                    <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{c.guest} • {c.validity}</p>
                </div>
                {c.status === "active" && <Button variant="ghost" size="sm">Révoquer</Button>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

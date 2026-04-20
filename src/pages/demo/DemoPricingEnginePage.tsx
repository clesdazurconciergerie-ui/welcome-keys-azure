// MODULE 3 — Version démo
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Plus } from "lucide-react";

const MOCK_RULES = [
  { name: "Été haute saison", type: "Saisonnière", adj: "+30%", period: "01/07 → 31/08", active: true },
  { name: "Weekend +15%", type: "Jour de semaine", adj: "+15%", period: "Vendredi, Samedi", active: true },
  { name: "Long séjour 7+ nuits", type: "Durée minimale", adj: "−10%", period: "≥ 7 nuits", active: false },
];

export default function DemoPricingEnginePage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Tarification dynamique
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Règles tarifaires automatiques par saison, jour, durée. Validation manuelle requise.
          </p>
        </div>
        <Button><Plus className="h-4 w-4 mr-1" /> Nouvelle règle</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Mes règles (3)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_RULES.map((r, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={r.active} />
                    <span className="font-semibold">{r.name}</span>
                    <Badge variant="outline">{r.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Ajustement : {r.adj} • {r.period}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

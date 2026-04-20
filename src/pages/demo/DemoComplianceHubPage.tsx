// MODULE 8 — Démo Compliance / Taxe de séjour
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Settings2, Download, FileText } from "lucide-react";
import { toast } from "sonner";

const MOCK_RECORDS = [
  { id: "1", property: "Villa Azur — Cannes", check_in: "2025-04-12", check_out: "2025-04-19", nights: 7, guests: 4, tax: 42.0, status: "pending" },
  { id: "2", property: "Appartement Promenade — Nice", check_in: "2025-04-08", check_out: "2025-04-11", nights: 3, guests: 2, tax: 9.0, status: "declared" },
  { id: "3", property: "Loft Vieux Port — Marseille", check_in: "2025-03-22", check_out: "2025-03-28", nights: 6, guests: 3, tax: 27.0, status: "paid" },
  { id: "4", property: "Villa Azur — Cannes", check_in: "2025-03-15", check_out: "2025-03-20", nights: 5, guests: 2, tax: 15.0, status: "paid" },
];

const MOCK_PROPS = [
  { id: "p1", name: "Villa Azur — Cannes", commune: "Cannes (06029)", rate: "1,50 €/nuit/pers", enabled: true },
  { id: "p2", name: "Appartement Promenade — Nice", commune: "Nice (06088)", rate: "1,50 €/nuit/pers", enabled: true },
  { id: "p3", name: "Loft Vieux Port — Marseille", commune: "Marseille (13055)", rate: "0,90 €/nuit/pers", enabled: true },
];

export default function DemoComplianceHubPage() {
  const totals = {
    pending: MOCK_RECORDS.filter((r) => r.status === "pending").reduce((s, r) => s + r.tax, 0),
    declared: MOCK_RECORDS.filter((r) => r.status === "declared").reduce((s, r) => s + r.tax, 0),
    paid: MOCK_RECORDS.filter((r) => r.status === "paid").reduce((s, r) => s + r.tax, 0),
  };
  const total = totals.pending + totals.declared + totals.paid;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Compliance — Taxe de séjour
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Calcul automatique, déclaration mairie, export CSV.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Démo : export CSV disponible en version complète")}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button onClick={() => toast.info("Démo : calcul automatique en version complète")}>
            <FileText className="h-4 w-4 mr-1" /> Calculer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total taxe" value={`${total.toFixed(2)} €`} />
        <KpiCard label="À déclarer" value={`${totals.pending.toFixed(2)} €`} variant="warn" />
        <KpiCard label="Déclarée" value={`${totals.declared.toFixed(2)} €`} variant="info" />
        <KpiCard label="Payée" value={`${totals.paid.toFixed(2)} €`} variant="ok" />
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Enregistrements ({MOCK_RECORDS.length})</TabsTrigger>
          <TabsTrigger value="settings">Configuration par bien</TabsTrigger>
        </TabsList>

        <TabsContent value="records">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="text-left p-3">Bien</th>
                  <th className="text-left p-3">Séjour</th>
                  <th className="text-right p-3">Nuits</th>
                  <th className="text-right p-3">Voyageurs</th>
                  <th className="text-right p-3">Taxe</th>
                  <th className="text-center p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RECORDS.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{r.property}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(r.check_in).toLocaleDateString("fr-FR")} → {new Date(r.check_out).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-3 text-right">{r.nights}</td>
                    <td className="p-3 text-right">{r.guests}</td>
                    <td className="p-3 text-right font-semibold">{r.tax.toFixed(2)} €</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        r.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                        r.status === "declared" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {r.status === "pending" ? "En attente" : r.status === "declared" ? "Déclarée" : "Payée"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-2">
          {MOCK_PROPS.map((p) => (
            <Card key={p.id}><CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.commune} • {p.rate} • Actif</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info("Démo : configuration en version complète")}>
                <Settings2 className="h-4 w-4 mr-1" /> Configurer
              </Button>
            </CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ label, value, variant }: { label: string; value: string; variant?: "ok" | "warn" | "info" }) {
  const colors =
    variant === "ok" ? "text-emerald-600" :
    variant === "warn" ? "text-amber-600" :
    variant === "info" ? "text-blue-600" : "text-foreground";
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${colors}`}>{value}</p>
    </CardContent></Card>
  );
}

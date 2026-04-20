// MODULE 8 — Compliance Hub : page taxe de séjour
import { useState, useMemo } from "react";
import { useTouristTaxSettings, useTouristTaxRecords, calculateTax, exportTaxRecordsCSV, type TouristTaxSettings } from "@/hooks/useTouristTax";
import { useProperties } from "@/hooks/useProperties";
import { useBookings } from "@/hooks/useBookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Receipt, Settings2, Download, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ComplianceHubPage() {
  const { settings, upsert } = useTouristTaxSettings();
  const { records, create, updateStatus } = useTouristTaxRecords();
  const { properties } = useProperties();
  const { bookings } = useBookings();
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  const propMap = new Map(properties?.map((p) => [p.id, p.name]) ?? []);
  const settingsMap = new Map(settings.map((s) => [s.property_id, s]));

  const totals = useMemo(() => {
    const pending = records.filter((r) => r.declaration_status === "pending").reduce((s, r) => s + Number(r.total_tax), 0);
    const declared = records.filter((r) => r.declaration_status === "declared").reduce((s, r) => s + Number(r.total_tax), 0);
    const paid = records.filter((r) => r.declaration_status === "paid").reduce((s, r) => s + Number(r.total_tax), 0);
    return { pending, declared, paid, total: pending + declared + paid };
  }, [records]);

  const handleAutoGenerate = () => {
    let count = 0;
    for (const b of bookings ?? []) {
      const s = settingsMap.get(b.property_id);
      if (!s || !s.is_enabled) continue;
      // skip if already exists
      if (records.some((r) => r.booking_id === b.id)) continue;
      const nights = Math.max(1, Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
      const guests = 2; // défaut, l'utilisateur peut éditer
      const tax = calculateTax(s, nights, guests, guests, Number(b.gross_amount ?? 0));
      if (tax > 0) {
        create({
          property_id: b.property_id,
          booking_id: b.id,
          check_in: b.check_in,
          check_out: b.check_out,
          nights,
          guests_count: guests,
          guests_taxable: guests,
          rate_applied: s.rate_amount,
          rate_type: s.rate_type,
          total_tax: tax,
        });
        count++;
      }
    }
    toast.success(`${count} enregistrement(s) généré(s)`);
  };

  const handleExportCSV = () => {
    const csv = exportTaxRecordsCSV(records, properties ?? []);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxe-sejour-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Compliance — Taxe de séjour
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Calcul automatique par séjour, déclaration mairie & export CSV.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={records.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button onClick={handleAutoGenerate}>
            <FileText className="h-4 w-4 mr-1" /> Calculer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total taxe" value={`${totals.total.toFixed(2)} €`} />
        <KpiCard label="À déclarer" value={`${totals.pending.toFixed(2)} €`} variant="warn" />
        <KpiCard label="Déclarée" value={`${totals.declared.toFixed(2)} €`} variant="info" />
        <KpiCard label="Payée" value={`${totals.paid.toFixed(2)} €`} variant="ok" />
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Enregistrements ({records.length})</TabsTrigger>
          <TabsTrigger value="settings">Configuration par bien</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-2">
          {records.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 text-primary/40 mx-auto mb-3" />
              <p className="font-semibold">Aucun enregistrement</p>
              <p className="text-sm text-muted-foreground mt-1">Configure d'abord tes biens, puis clique sur "Calculer".</p>
            </CardContent></Card>
          ) : (
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
                  {records.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3">{propMap.get(r.property_id) ?? "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(r.check_in).toLocaleDateString("fr-FR")} → {new Date(r.check_out).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-3 text-right">{r.nights}</td>
                      <td className="p-3 text-right">{r.guests_taxable}</td>
                      <td className="p-3 text-right font-semibold">{Number(r.total_tax).toFixed(2)} €</td>
                      <td className="p-3 text-center">
                        <Select
                          value={r.declaration_status}
                          onValueChange={(v: any) => updateStatus({ id: r.id, status: v })}
                        >
                          <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="declared">Déclarée</SelectItem>
                            <SelectItem value="paid">Payée</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-2">
          {(properties ?? []).map((p) => {
            const s = settingsMap.get(p.id);
            return (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {s ? (
                      <p className="text-xs text-muted-foreground">
                        {s.commune_name ?? "Commune non définie"} • {s.rate_amount} {s.rate_type === "percentage" ? "%" : "€/nuit/pers"}
                        {s.is_enabled ? " • Actif" : " • Désactivé"}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Non configuré</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditingPropertyId(p.id)}>
                    <Settings2 className="h-4 w-4 mr-1" /> Configurer
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {editingPropertyId && (
        <SettingsDialog
          propertyId={editingPropertyId}
          existing={settingsMap.get(editingPropertyId)}
          onClose={() => setEditingPropertyId(null)}
          onSave={(s) => {
            upsert(s);
            setEditingPropertyId(null);
          }}
        />
      )}
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

function SettingsDialog({
  propertyId,
  existing,
  onClose,
  onSave,
}: {
  propertyId: string;
  existing: TouristTaxSettings | undefined;
  onClose: () => void;
  onSave: (s: Partial<TouristTaxSettings> & { property_id: string }) => void;
}) {
  const [form, setForm] = useState<Partial<TouristTaxSettings>>(
    existing ?? {
      is_enabled: true,
      rate_type: "fixed_per_night_per_person",
      rate_amount: 1.5,
      exempt_under_age: 18,
      classification: "meuble_tourisme_non_classe",
    }
  );

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Configuration taxe de séjour</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Taxe activée</Label>
            <Switch checked={form.is_enabled ?? true} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Commune</Label>
              <Input value={form.commune_name ?? ""} onChange={(e) => setForm({ ...form, commune_name: e.target.value })} placeholder="Nice" />
            </div>
            <div>
              <Label>Code INSEE</Label>
              <Input value={form.commune_code ?? ""} onChange={(e) => setForm({ ...form, commune_code: e.target.value })} placeholder="06088" />
            </div>
          </div>
          <div>
            <Label>Type de tarif</Label>
            <Select value={form.rate_type} onValueChange={(v: any) => setForm({ ...form, rate_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_per_night_per_person">Forfait €/nuit/personne</SelectItem>
                <SelectItem value="percentage">Pourcentage du loyer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tarif</Label>
              <Input
                type="number"
                step="0.01"
                value={form.rate_amount ?? 0}
                onChange={(e) => setForm({ ...form, rate_amount: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Plafond (€/nuit)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.max_amount_per_night ?? ""}
                onChange={(e) => setForm({ ...form, max_amount_per_night: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
          </div>
          <div>
            <Label>Exonération (moins de X ans)</Label>
            <Input
              type="number"
              value={form.exempt_under_age ?? 18}
              onChange={(e) => setForm({ ...form, exempt_under_age: parseInt(e.target.value) })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave({ ...form, property_id: propertyId })}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

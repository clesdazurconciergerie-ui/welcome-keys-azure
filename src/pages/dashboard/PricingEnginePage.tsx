// MODULE 3 — Page Pricing Engine
import { useState } from "react";
import { usePricingRules, type PricingRule } from "@/hooks/usePricingRules";
import { useProperties } from "@/hooks/useProperties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, TrendingUp, Trash2, Sparkles } from "lucide-react";

const RULE_TYPES = [
  { value: "seasonal", label: "Saisonnière (plage de dates)" },
  { value: "weekday", label: "Jour de la semaine" },
  { value: "min_nights", label: "Durée minimale" },
  { value: "lastminute", label: "Last minute" },
  { value: "longstay", label: "Long séjour" },
];

export default function PricingEnginePage() {
  const { rules, isLoading, create, update, remove } = usePricingRules();
  const { properties } = useProperties();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<PricingRule>>({
    rule_type: "seasonal",
    adjustment_type: "percent",
    adjustment_value: 10,
    is_active: true,
    priority: 0,
  });

  const handleSave = () => {
    if (!form.name) return;
    create(form);
    setOpen(false);
    setForm({ rule_type: "seasonal", adjustment_type: "percent", adjustment_value: 10, is_active: true, priority: 0 });
  };

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nouvelle règle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle règle tarifaire</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Été haute saison" />
              </div>
              <div>
                <Label>Bien (vide = tous)</Label>
                <Select value={form.property_id ?? "all"} onValueChange={(v) => setForm({ ...form, property_id: v === "all" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les biens</SelectItem>
                    {properties?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de règle</Label>
                <Select value={form.rule_type} onValueChange={(v: any) => setForm({ ...form, rule_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.rule_type === "seasonal" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Du</Label><Input type="date" value={form.date_start ?? ""} onChange={(e) => setForm({ ...form, date_start: e.target.value })} /></div>
                  <div><Label>Au</Label><Input type="date" value={form.date_end ?? ""} onChange={(e) => setForm({ ...form, date_end: e.target.value })} /></div>
                </div>
              )}
              {form.rule_type === "min_nights" && (
                <div><Label>Min nuits</Label><Input type="number" value={form.min_nights ?? ""} onChange={(e) => setForm({ ...form, min_nights: parseInt(e.target.value) })} /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type ajustement</Label>
                  <Select value={form.adjustment_type} onValueChange={(v: any) => setForm({ ...form, adjustment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Valeur</Label><Input type="number" value={form.adjustment_value ?? 0} onChange={(e) => setForm({ ...form, adjustment_value: parseFloat(e.target.value) })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSave}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Mes règles ({rules.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-primary/40 mx-auto mb-3" />
              <p className="font-semibold">Aucune règle configurée</p>
              <p className="text-sm text-muted-foreground mt-1">Créez votre première règle pour automatiser vos tarifs.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Switch checked={r.is_active} onCheckedChange={(v) => update({ id: r.id, is_active: v })} />
                      <span className="font-semibold">{r.name}</span>
                      <Badge variant="outline">{RULE_TYPES.find(t => t.value === r.rule_type)?.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajustement : {r.adjustment_value}{r.adjustment_type === "percent" ? "%" : "€"}
                      {r.date_start && ` • du ${r.date_start} au ${r.date_end}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

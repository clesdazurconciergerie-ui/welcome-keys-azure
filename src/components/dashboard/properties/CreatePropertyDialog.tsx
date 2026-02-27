import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { PropertyFormData } from "@/hooks/useProperties";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PropertyFormData) => Promise<any>;
}

const propertyTypes = [
  { value: "apartment", label: "Appartement" },
  { value: "house", label: "Maison" },
  { value: "villa", label: "Villa" },
  { value: "studio", label: "Studio" },
  { value: "loft", label: "Loft" },
  { value: "chalet", label: "Chalet" },
  { value: "other", label: "Autre" },
];

export function CreatePropertyDialog({ open, onOpenChange, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PropertyFormData>({
    name: "",
    address: "",
    city: "",
    postcode: "",
    country: "France",
    surface_m2: null,
    capacity: null,
    bedrooms: null,
    bathrooms: null,
    property_type: "apartment",
    avg_nightly_rate: null,
    pricing_strategy: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address) return;
    setLoading(true);
    const result = await onSubmit(form);
    setLoading(false);
    if (result) {
      setForm({
        name: "", address: "", city: "", postcode: "", country: "France",
        surface_m2: null, capacity: null, bedrooms: null, bathrooms: null,
        property_type: "apartment", avg_nightly_rate: null, pricing_strategy: "", notes: "",
      });
      onOpenChange(false);
    }
  };

  const setNum = (field: keyof PropertyFormData, val: string) => {
    setForm(p => ({ ...p, [field]: val ? Number(val) : null }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un bien</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Nom du bien *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required maxLength={200} placeholder="Ex: Appartement Vue Mer" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Adresse *</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} required maxLength={500} placeholder="12 rue de la Plage" />
            </div>
            <div className="space-y-1.5">
              <Label>Ville</Label>
              <Input value={form.city || ""} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Code postal</Label>
              <Input value={form.postcode || ""} onChange={e => setForm(p => ({ ...p, postcode: e.target.value }))} maxLength={10} />
            </div>
          </div>

          {/* Type & characteristics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type de bien</Label>
              <Select value={form.property_type || "apartment"} onValueChange={v => setForm(p => ({ ...p, property_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {propertyTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Surface (m²)</Label>
              <Input type="number" min={0} value={form.surface_m2 ?? ""} onChange={e => setNum("surface_m2", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Capacité (pers.)</Label>
              <Input type="number" min={0} value={form.capacity ?? ""} onChange={e => setNum("capacity", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Chambres</Label>
              <Input type="number" min={0} value={form.bedrooms ?? ""} onChange={e => setNum("bedrooms", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Salles de bain</Label>
              <Input type="number" min={0} value={form.bathrooms ?? ""} onChange={e => setNum("bathrooms", e.target.value)} />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tarif moyen / nuit (€)</Label>
              <Input type="number" min={0} step={0.01} value={form.avg_nightly_rate ?? ""} onChange={e => setNum("avg_nightly_rate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stratégie tarifaire</Label>
              <Input value={form.pricing_strategy || ""} onChange={e => setForm(p => ({ ...p, pricing_strategy: e.target.value }))} maxLength={500} placeholder="Dynamique, fixe, saisonnier..." />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes internes</Label>
            <Textarea value={form.notes || ""} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} maxLength={1000} placeholder="Notes visibles uniquement par la conciergerie" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading} className="bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))] font-semibold">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer le bien
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

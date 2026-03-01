import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { Save, Loader2 } from "lucide-react";

export function FinanceSettingsTab() {
  const { settings, loading, saveSettings } = useFinancialSettings();
  const [form, setForm] = useState({
    company_name: "",
    address: "",
    vat_number: "",
    default_vat_rate: 20,
    invoice_prefix: "FAC",
    iban: "",
    legal_footer: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || "",
        address: settings.address || "",
        vat_number: settings.vat_number || "",
        default_vat_rate: settings.default_vat_rate || 20,
        invoice_prefix: settings.invoice_prefix || "FAC",
        iban: settings.iban || "",
        legal_footer: settings.legal_footer || "",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(form);
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-muted-foreground mt-4">Chargement...</p>;

  return (
    <div className="space-y-6 mt-4 max-w-2xl">
      <h2 className="text-lg font-semibold">Paramètres financiers</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Informations de la société</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Nom de la société</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Ma Conciergerie SAS" /></div>
          <div><Label>Adresse</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Rue Example&#10;06000 Nice" rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>N° TVA</Label><Input value={form.vat_number} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} placeholder="FR12345678901" /></div>
            <div><Label>Taux TVA par défaut (%)</Label><Input type="number" value={form.default_vat_rate} onChange={e => setForm(f => ({ ...f, default_vat_rate: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Facturation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Préfixe facture</Label><Input value={form.invoice_prefix} onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} placeholder="FAC" /></div>
            <div>
              <Label>Prochain numéro</Label>
              <Input value={settings?.next_invoice_number || 1} disabled className="bg-muted" />
              <p className="text-[10px] text-muted-foreground mt-1">Auto-incrémenté</p>
            </div>
          </div>
          <div><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="FR76 1234 5678 9012 3456 7890 123" /></div>
          <div><Label>Devise</Label><Input value="EUR (€)" disabled className="bg-muted" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Mentions légales</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.legal_footer} onChange={e => setForm(f => ({ ...f, legal_footer: e.target.value }))} placeholder="Pénalités de retard : 3 fois le taux d'intérêt légal…" rows={3} />
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Enregistrer
      </Button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useServicesCatalog, type ServiceCatalogItem } from "@/hooks/useServicesCatalog";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { formatEUR } from "@/lib/finance-utils";

export function FinanceSettingsTab() {
  const { settings, loading, saveSettings, refetch, cleanupVatData } = useFinancialSettings();
  const { services, loading: sLoading, create: createService, update: updateService, remove: removeService } = useServicesCatalog();

  const [form, setForm] = useState({
    company_name: "",
    address: "",
    vat_number: "",
    default_vat_rate: 20,
    invoice_prefix: "FAC",
    default_due_days: 30,
    iban: "",
    legal_footer: "",
    vat_enabled: true,
  });
  const [saving, setSaving] = useState(false);

  // Service catalog form
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcPrice, setNewSvcPrice] = useState("");
  const [newSvcVat, setNewSvcVat] = useState("20");
  const [newSvcUnit, setNewSvcUnit] = useState("unité");
  const [editingSvc, setEditingSvc] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceCatalogItem>>({});

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || "",
        address: settings.address || "",
        vat_number: settings.vat_number || "",
        default_vat_rate: settings.default_vat_rate || 20,
        invoice_prefix: settings.invoice_prefix || "FAC",
        default_due_days: (settings as any).default_due_days || 30,
        iban: settings.iban || "",
        legal_footer: settings.legal_footer || "",
        vat_enabled: (settings as any).vat_enabled ?? true,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(form);
    setSaving(false);
  };

  const handleAddService = async () => {
    if (!newSvcName || !newSvcPrice) return;
    await createService({
      name: newSvcName,
      default_unit_price: parseFloat(newSvcPrice),
      default_vat_rate: parseFloat(newSvcVat) || 20,
      unit_label: newSvcUnit || "unité",
      active: true,
    });
    setNewSvcName(""); setNewSvcPrice(""); setNewSvcVat("20"); setNewSvcUnit("unité");
  };

  const startEditSvc = (svc: ServiceCatalogItem) => {
    setEditingSvc(svc.id);
    setEditForm({ name: svc.name, default_unit_price: svc.default_unit_price, default_vat_rate: svc.default_vat_rate, unit_label: svc.unit_label });
  };

  const saveEditSvc = async () => {
    if (!editingSvc) return;
    await updateService(editingSvc, editForm);
    setEditingSvc(null);
  };

  if (loading) return <p className="text-sm text-muted-foreground mt-4">Chargement...</p>;

  return (
    <div className="space-y-6 mt-4 max-w-3xl">
      <h2 className="text-lg font-semibold">Paramètres financiers</h2>

      {/* Company Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informations de la société</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Nom de la société</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Ma Conciergerie SAS" /></div>
          <div><Label>Adresse</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Rue Example&#10;06000 Nice" rows={3} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Assujetti à la TVA</Label>
              <p className="text-xs text-muted-foreground">Activez si votre organisation est soumise à la TVA</p>
            </div>
            <Switch checked={form.vat_enabled} onCheckedChange={v => setForm(f => ({ ...f, vat_enabled: v }))} />
          </div>
          {form.vat_enabled ? (
            <div className="grid grid-cols-2 gap-4">
              <div><Label>N° TVA</Label><Input value={form.vat_number} onChange={e => setForm(f => ({ ...f, vat_number: e.target.value }))} placeholder="FR12345678901" /></div>
              <div><Label>Taux TVA par défaut (%)</Label><Input type="number" value={form.default_vat_rate} onChange={e => setForm(f => ({ ...f, default_vat_rate: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-xs text-amber-800">TVA désactivée — les factures et dépenses existantes peuvent encore contenir des montants TVA.</p>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={async () => { await cleanupVatData(); refetch(); }}>
                Nettoyer les données TVA existantes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader><CardTitle className="text-base">Facturation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Préfixe facture</Label><Input value={form.invoice_prefix} onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} placeholder="FAC" /></div>
            <div>
              <Label>Prochain numéro</Label>
              <Input value={settings?.next_invoice_number || 1} disabled className="bg-muted" />
              <p className="text-[10px] text-muted-foreground mt-1">Auto-incrémenté</p>
            </div>
            <div><Label>Délai paiement (jours)</Label><Input type="number" value={form.default_due_days} onChange={e => setForm(f => ({ ...f, default_due_days: parseInt(e.target.value) || 30 }))} /></div>
          </div>
          <div><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="FR76 1234 5678 9012 3456 7890 123" /></div>
          <div><Label>Devise</Label><Input value="EUR (€)" disabled className="bg-muted" /></div>
        </CardContent>
      </Card>

      {/* Legal */}
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

      {/* Service Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catalogue de services</CardTitle>
          <p className="text-xs text-muted-foreground">Définissez vos prestations récurrentes pour les ajouter rapidement aux factures</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add form */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Nom</Label>
              <Input value={newSvcName} onChange={e => setNewSvcName(e.target.value)} placeholder="Ménage standard" className="h-9" />
            </div>
            <div className="w-24">
              <Label className="text-xs">Prix HT (€)</Label>
              <Input type="number" step="0.01" value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)} className="h-9" />
            </div>
            <div className="w-20">
              <Label className="text-xs">TVA %</Label>
              <Input type="number" value={newSvcVat} onChange={e => setNewSvcVat(e.target.value)} className="h-9" />
            </div>
            <div className="w-24">
              <Label className="text-xs">Unité</Label>
              <Input value={newSvcUnit} onChange={e => setNewSvcUnit(e.target.value)} className="h-9" placeholder="unité" />
            </div>
            <Button onClick={handleAddService} disabled={!newSvcName || !newSvcPrice} size="sm" className="h-9 gap-1">
              <Plus className="h-4 w-4" />Ajouter
            </Button>
          </div>

          {/* List */}
          {sLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun service dans le catalogue</p>
          ) : (
            <div className="space-y-1.5">
              {services.map(svc => (
                <div key={svc.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                  {editingSvc === svc.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm flex-1" />
                      <Input type="number" step="0.01" value={editForm.default_unit_price || 0} onChange={e => setEditForm(f => ({ ...f, default_unit_price: parseFloat(e.target.value) }))} className="h-8 text-sm w-24" />
                      <Input type="number" value={editForm.default_vat_rate || 0} onChange={e => setEditForm(f => ({ ...f, default_vat_rate: parseFloat(e.target.value) }))} className="h-8 text-sm w-16" />
                      <Button size="icon" className="h-7 w-7" onClick={saveEditSvc}><Check className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSvc(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatEUR(svc.default_unit_price)} / {svc.unit_label} · TVA {svc.default_vat_rate}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditSvc(svc)}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeService(svc.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useServicesCatalog, type ServiceCatalogItem } from "@/hooks/useServicesCatalog";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Plus, Trash2, Edit2, Check, X, RotateCcw } from "lucide-react";
import { formatEUR } from "@/lib/finance-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function contrastColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

export function FinanceSettingsTab() {
  const { settings, loading, saveSettings, refetch, cleanupVatData } = useFinancialSettings();
  const { services, loading: sLoading, create: createService, update: updateService, remove: removeService } = useServicesCatalog();

  const [form, setForm] = useState({
    company_name: "",
    address: "",
    org_phone: "",
    org_postal_code: "",
    org_city: "",
    vat_number: "",
    default_vat_rate: 20,
    invoice_prefix: "FAC",
    default_due_days: 7,
    iban: "",
    bic: "",
    legal_footer: "",
    vat_enabled: true,
    invoice_primary_color: "#061452",
    invoice_accent_color: "#C4A45B",
    invoice_text_color: "",
    next_invoice_number: 1,
  });
  const [saving, setSaving] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);

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
        org_phone: (settings as any).org_phone || "",
        org_postal_code: (settings as any).org_postal_code || "",
        org_city: (settings as any).org_city || "",
        vat_number: settings.vat_number || "",
        default_vat_rate: settings.default_vat_rate || 20,
        invoice_prefix: settings.invoice_prefix || "FAC",
        default_due_days: settings.default_due_days || 7,
        iban: settings.iban || "",
        bic: (settings as any).bic || "",
        legal_footer: settings.legal_footer || "",
        vat_enabled: settings.vat_enabled ?? true,
        invoice_primary_color: (settings as any).invoice_primary_color || "#061452",
        invoice_accent_color: (settings as any).invoice_accent_color || "#C4A45B",
        invoice_text_color: (settings as any).invoice_text_color || "",
        next_invoice_number: settings.next_invoice_number || 1,
      });
      setLogoUrl(settings.logo_url || null);
      setSignatureUrl((settings as any).default_signature_url || null);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées (PNG, JPG, SVG)");
      return;
    }
    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non authentifié"); return; }

      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(filePath, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        toast.error(`Erreur upload: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();

      await saveSettings({ logo_url: publicUrl });
      setLogoUrl(publicUrl);
      toast.success("Logo mis à jour");
    } catch (err: any) {
      toast.error(`Erreur: ${err?.message || "Erreur inconnue"}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    await saveSettings({ logo_url: null });
    setLogoUrl(null);
    toast.success("Logo supprimé");
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSignature(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non authentifié"); return; }
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/signature.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("branding")
        .upload(filePath, file, { contentType: file.type, upsert: true });
      if (uploadError) { toast.error(`Erreur upload: ${uploadError.message}`); return; }
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + "?t=" + Date.now();
      await saveSettings({ default_signature_url: publicUrl } as any);
      setSignatureUrl(publicUrl);
      toast.success("Signature mise à jour");
    } catch (err: any) {
      toast.error(`Erreur: ${err?.message || "Erreur inconnue"}`);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleRemoveSignature = async () => {
    await saveSettings({ default_signature_url: null } as any);
    setSignatureUrl(null);
    toast.success("Signature supprimée");
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(form);
    setSaving(false);
  };

  const handleResetNumber = async () => {
    setForm(f => ({ ...f, next_invoice_number: 1 }));
    await saveSettings({ next_invoice_number: 1 });
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

  const primaryColor = form.invoice_primary_color || "#061452";
  const accentColor = form.invoice_accent_color || "#C4A45B";
  const autoTextColor = form.invoice_text_color || contrastColor(primaryColor);
  const previewInvoiceNumber = `${form.invoice_prefix || "FAC"}-${new Date().getFullYear()}-${String(form.next_invoice_number || 1).padStart(3, "0")}`;

  return (
    <div className="space-y-6 mt-4 max-w-3xl">
      <h2 className="text-lg font-semibold">Paramètres financiers</h2>

      {/* Company Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Informations de la société</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Nom de la société</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Azur Keys" /></div>
          <div><Label>Adresse (rue)</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="35 chemin du castellas" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Code postal</Label><Input value={form.org_postal_code} onChange={e => setForm(f => ({ ...f, org_postal_code: e.target.value }))} placeholder="83700" /></div>
            <div><Label>Ville</Label><Input value={form.org_city} onChange={e => setForm(f => ({ ...f, org_city: e.target.value }))} placeholder="Saint-Raphaël" /></div>
          </div>
          <div><Label>Téléphone</Label><Input value={form.org_phone} onChange={e => setForm(f => ({ ...f, org_phone: e.target.value }))} placeholder="06.03.70.97.77" /></div>
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
              <p className="text-xs text-amber-800">TVA non applicable — mention légale « TVA non applicable - article 293 B du CGI. » ajoutée automatiquement sur les factures.</p>
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={async () => { await cleanupVatData(); refetch(); }}>
                Nettoyer les données TVA existantes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader><CardTitle className="text-base">Logo (factures)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="h-20 w-40 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="relative cursor-pointer inline-block">
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-8 pointer-events-none" tabIndex={-1} asChild>
                    <span>
                      {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Remplacer
                    </span>
                  </Button>
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
                <Button variant="ghost" size="sm" className="gap-2 text-xs h-8 text-destructive" onClick={handleRemoveLogo}>
                  <Trash2 className="h-3.5 w-3.5" />Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <label className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-8 cursor-pointer hover:border-primary/40 transition-colors">
              <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
              {uploadingLogo ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquez pour ajouter votre logo</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG ou SVG</p>
                </>
              )}
            </label>
          )}
        </CardContent>
      </Card>

      {/* Default Concierge Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Signature concierge par défaut
          </CardTitle>
          <p className="text-xs text-muted-foreground">Utilisée automatiquement dans les états des lieux PDF</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {signatureUrl ? (
            <div className="flex items-center gap-4">
              <div className="h-20 w-48 rounded border bg-muted/30 flex items-center justify-center overflow-hidden p-2">
                <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="relative cursor-pointer inline-block">
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-8 pointer-events-none" tabIndex={-1} asChild>
                    <span>
                      {uploadingSignature ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      Remplacer
                    </span>
                  </Button>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleSignatureUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
                <Button variant="ghost" size="sm" className="gap-2 text-xs h-8 text-destructive" onClick={handleRemoveSignature}>
                  <Trash2 className="h-3.5 w-3.5" />Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <label className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-8 cursor-pointer hover:border-primary/40 transition-colors">
              <input type="file" accept="image/png,image/jpeg" onChange={handleSignatureUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
              {uploadingSignature ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <PenTool className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Cliquez pour ajouter votre signature</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PNG ou JPG</p>
                </>
              )}
            </label>
          )}
        </CardContent>
      </Card>

      {/* ═══ INVOICE THEME ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Thème de la facture
          </CardTitle>
          <p className="text-xs text-muted-foreground">Personnalisez les couleurs de vos factures PDF</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setForm(f => ({ ...f, invoice_primary_color: e.target.value }))}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={form.invoice_primary_color}
                  onChange={e => setForm(f => ({ ...f, invoice_primary_color: e.target.value }))}
                  placeholder="#061452"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">En-tête, titres, bordures</p>
            </div>
            <div className="space-y-2">
              <Label>Couleur d'accent</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setForm(f => ({ ...f, invoice_accent_color: e.target.value }))}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={form.invoice_accent_color}
                  onChange={e => setForm(f => ({ ...f, invoice_accent_color: e.target.value }))}
                  placeholder="#C4A45B"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Séparateurs, accents dorés</p>
            </div>
            <div className="space-y-2">
              <Label>Couleur du texte (optionnel)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.invoice_text_color || autoTextColor}
                  onChange={e => setForm(f => ({ ...f, invoice_text_color: e.target.value }))}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={form.invoice_text_color}
                  onChange={e => setForm(f => ({ ...f, invoice_text_color: e.target.value }))}
                  placeholder="Auto (contraste)"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Vide = auto-contraste</p>
            </div>
          </div>

          {/* Mini preview */}
          <div className="rounded-lg border p-4 bg-white">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Aperçu</p>
            <div className="rounded overflow-hidden border" style={{ maxWidth: 340 }}>
              <div
                style={{
                  backgroundColor: primaryColor,
                  color: autoTextColor,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" as const, borderBottom: `2px solid ${accentColor}`, paddingBottom: 2, display: "inline-block" }}>
                    {form.company_name || "Ma Conciergerie"}
                  </div>
                  <p style={{ fontSize: 8, opacity: 0.8, margin: "4px 0 0" }}>
                    {form.address || "Adresse"} — {form.org_city || "Ville"}
                  </p>
                </div>
                <div style={{ textAlign: "right" as const }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const, borderBottom: `2px solid ${accentColor}`, paddingBottom: 2, display: "inline-block" }}>
                    Nom Propriétaire
                  </div>
                </div>
              </div>
              <div style={{ padding: "8px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 2, height: 20, backgroundColor: accentColor, borderRadius: 1 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: primaryColor, textTransform: "uppercase" as const, letterSpacing: 1 }}>
                    Facture N° {previewInvoiceNumber}
                  </span>
                </div>
                <div style={{ border: `1px solid ${primaryColor}30`, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ backgroundColor: primaryColor, color: autoTextColor, fontSize: 7, padding: "4px 8px", display: "flex", justifyContent: "space-between" }}>
                    <span>Désignation</span><span>Total</span>
                  </div>
                  <div style={{ fontSize: 7, padding: "4px 8px", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${primaryColor}15` }}>
                    <span>Exemple de prestation</span><span>100,00 €</span>
                  </div>
                </div>
                <div style={{ marginTop: 6, borderTop: `1px solid ${accentColor}`, paddingTop: 4 }}>
                  <span style={{ fontSize: 7, fontWeight: 700, color: primaryColor }}>Modalités de paiement</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ NUMBERING ═══ */}
      <Card>
        <CardHeader><CardTitle className="text-base">Numérotation des factures</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Préfixe</Label>
              <Input
                value={form.invoice_prefix}
                onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))}
                placeholder="FAC"
              />
            </div>
            <div>
              <Label>Prochain numéro de séquence</Label>
              <Input
                type="number"
                min={1}
                value={form.next_invoice_number}
                onChange={e => setForm(f => ({ ...f, next_invoice_number: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">Prochaine facture : <span className="font-mono">{previewInvoiceNumber}</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Le numéro s'incrémente automatiquement après chaque facture créée</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={handleResetNumber}>
              <RotateCcw className="h-3 w-3" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader><CardTitle className="text-base">Facturation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Délai paiement (jours)</Label><Input type="number" value={form.default_due_days} onChange={e => setForm(f => ({ ...f, default_due_days: parseInt(e.target.value) || 7 }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>IBAN</Label><Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="FR76 1234 5678 ..." /></div>
            <div><Label>BIC</Label><Input value={form.bic} onChange={e => setForm(f => ({ ...f, bic: e.target.value }))} placeholder="REVOFRP" /></div>
          </div>
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
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Nom</Label>
              <Input value={newSvcName} onChange={e => setNewSvcName(e.target.value)} placeholder="Ménage standard" className="h-9" />
            </div>
            <div className="w-24">
              <Label className="text-xs">Prix (€)</Label>
              <Input type="number" step="0.01" value={newSvcPrice} onChange={e => setNewSvcPrice(e.target.value)} className="h-9" />
            </div>
            {form.vat_enabled && (
              <div className="w-20">
                <Label className="text-xs">TVA %</Label>
                <Input type="number" value={newSvcVat} onChange={e => setNewSvcVat(e.target.value)} className="h-9" />
              </div>
            )}
            <div className="w-24">
              <Label className="text-xs">Unité</Label>
              <Input value={newSvcUnit} onChange={e => setNewSvcUnit(e.target.value)} className="h-9" placeholder="unité" />
            </div>
            <Button onClick={handleAddService} disabled={!newSvcName || !newSvcPrice} size="sm" className="h-9 gap-1">
              <Plus className="h-4 w-4" />Ajouter
            </Button>
          </div>

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
                      <Button size="icon" className="h-7 w-7" onClick={saveEditSvc}><Check className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSvc(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatEUR(svc.default_unit_price)} / {svc.unit_label}
                          {form.vat_enabled && ` · TVA ${svc.default_vat_rate}%`}
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

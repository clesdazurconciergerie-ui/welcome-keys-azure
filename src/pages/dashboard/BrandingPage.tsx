import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { Switch } from "@/components/ui/switch";
import {
  Save, Loader2, Upload, ImageIcon, Trash2, Palette, PenTool, FileText, ClipboardCheck, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

function contrastColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#1a1a1a" : "#ffffff";
}

export default function BrandingPage() {
  const { settings, loading, saveSettings } = useFinancialSettings();

  const [primaryColor, setPrimaryColor] = useState("#061452");
  const [accentColor, setAccentColor] = useState("#C4A45B");
  const [textColor, setTextColor] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState<"invoice" | "inspection" | "booklet">("invoice");

  const companyName = (settings as any)?.company_name || "Ma Conciergerie";
  const address = (settings as any)?.address || "Adresse";
  const city = (settings as any)?.org_city || "Ville";

  useEffect(() => {
    if (settings) {
      setPrimaryColor((settings as any).invoice_primary_color || "#061452");
      setAccentColor((settings as any).invoice_accent_color || "#C4A45B");
      setTextColor((settings as any).invoice_text_color || "");
      setLogoUrl(settings.logo_url || null);
      setSignatureUrl((settings as any).default_signature_url || null);
    }
  }, [settings]);

  const autoTextColor = textColor || contrastColor(primaryColor);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Seules les images sont acceptées"); return; }
    setUploadingLogo(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Non authentifié"); return; }
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/logo.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(filePath, file, { contentType: file.type, upsert: true });
      if (error) { toast.error(`Erreur upload: ${error.message}`); return; }
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(filePath);
      const url = urlData.publicUrl + "?t=" + Date.now();
      await saveSettings({ logo_url: url });
      setLogoUrl(url);
      toast.success("Logo mis à jour");
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally { setUploadingLogo(false); }
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
      const { error } = await supabase.storage.from("branding").upload(filePath, file, { contentType: file.type, upsert: true });
      if (error) { toast.error(`Erreur upload: ${error.message}`); return; }
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(filePath);
      const url = urlData.publicUrl + "?t=" + Date.now();
      await saveSettings({ default_signature_url: url } as any);
      setSignatureUrl(url);
      toast.success("Signature mise à jour");
    } catch (err: any) {
      toast.error(err?.message || "Erreur");
    } finally { setUploadingSignature(false); }
  };

  const handleRemoveSignature = async () => {
    await saveSettings({ default_signature_url: null } as any);
    setSignatureUrl(null);
    toast.success("Signature supprimée");
  };

  const handleSaveColors = async () => {
    setSaving(true);
    await saveSettings({
      invoice_primary_color: primaryColor,
      invoice_accent_color: accentColor,
      invoice_text_color: textColor,
    } as any);
    setSaving(false);
    toast.success("Couleurs enregistrées");
  };

  if (loading) return <p className="text-sm text-muted-foreground p-6">Chargement...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground">Apparence & Branding</h1>
        <p className="text-muted-foreground mt-1">
          Identité visuelle appliquée à tous vos documents : factures, états des lieux, livrets d'accueil.
        </p>
      </motion.div>

      {/* ═══ COLORS ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Couleurs de marque
          </CardTitle>
          <p className="text-xs text-muted-foreground">Ces couleurs sont appliquées à toutes les générations PDF et pages digitales</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Primary */}
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} placeholder="#061452" className="font-mono text-sm" />
              </div>
              <p className="text-[10px] text-muted-foreground">En-têtes, titres, bordures</p>
            </div>
            {/* Accent */}
            <div className="space-y-2">
              <Label>Couleur d'accent</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} placeholder="#C4A45B" className="font-mono text-sm" />
              </div>
              <p className="text-[10px] text-muted-foreground">Séparateurs, accents, filets</p>
            </div>
            {/* Text override */}
            <div className="space-y-2">
              <Label>Couleur du texte (optionnel)</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor || autoTextColor} onChange={e => setTextColor(e.target.value)} className="w-10 h-10 rounded border border-border cursor-pointer" />
                <Input value={textColor} onChange={e => setTextColor(e.target.value)} placeholder="Auto (contraste)" className="font-mono text-sm" />
              </div>
              <p className="text-[10px] text-muted-foreground">Vide = auto-contraste</p>
            </div>
          </div>

          <Button onClick={handleSaveColors} disabled={saving} size="sm" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer les couleurs
          </Button>
        </CardContent>
      </Card>

      {/* ═══ LOGO ═══ */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" />Logo de la conciergerie</CardTitle>
          <p className="text-xs text-muted-foreground">Affiché sur les factures, états des lieux et livrets</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="h-20 w-40 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="relative cursor-pointer inline-block">
                  <Button variant="outline" size="sm" className="gap-2 text-xs h-8 pointer-events-none" tabIndex={-1} asChild>
                    <span>{uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Remplacer</span>
                  </Button>
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
                <Button variant="ghost" size="sm" className="gap-2 text-xs h-8 text-destructive" onClick={handleRemoveLogo}>
                  <Trash2 className="h-3.5 w-3.5" />Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <label className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-8 cursor-pointer hover:border-primary/40 transition-colors">
              <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploadingLogo ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : (
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

      {/* ═══ SIGNATURE ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PenTool className="h-4 w-4" />Signature par défaut</CardTitle>
          <p className="text-xs text-muted-foreground">Utilisée automatiquement dans les états des lieux et documents PDF</p>
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
                    <span>{uploadingSignature ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}Remplacer</span>
                  </Button>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleSignatureUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
                <Button variant="ghost" size="sm" className="gap-2 text-xs h-8 text-destructive" onClick={handleRemoveSignature}>
                  <Trash2 className="h-3.5 w-3.5" />Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <label className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-8 cursor-pointer hover:border-primary/40 transition-colors">
              <input type="file" accept="image/png,image/jpeg" onChange={handleSignatureUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploadingSignature ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : (
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

      {/* ═══ PREVIEW ═══ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aperçu de l'identité visuelle</CardTitle>
          <p className="text-xs text-muted-foreground">Visualisez comment vos couleurs apparaîtront sur vos documents</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab selector */}
          <div className="flex gap-2">
            {[
              { key: "invoice" as const, label: "Facture", icon: FileText },
              { key: "inspection" as const, label: "État des lieux", icon: ClipboardCheck },
              { key: "booklet" as const, label: "Livret", icon: BookOpen },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={previewTab === key ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => setPreviewTab(key)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>

          {/* Invoice preview */}
          {previewTab === "invoice" && (
            <div className="rounded-lg border p-4 bg-white">
              <div className="rounded overflow-hidden border" style={{ maxWidth: 400 }}>
                <div style={{ backgroundColor: primaryColor, color: autoTextColor, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", borderBottom: `2px solid ${accentColor}`, paddingBottom: 2, display: "inline-block" }}>
                      {companyName}
                    </div>
                    <p style={{ fontSize: 8, opacity: 0.8, margin: "4px 0 0" }}>{address} — {city}</p>
                  </div>
                  {logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: 32, maxWidth: 48, objectFit: "contain" }} />}
                </div>
                <div style={{ padding: "10px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 3, height: 20, backgroundColor: accentColor, borderRadius: 1 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: primaryColor, textTransform: "uppercase", letterSpacing: 1 }}>Facture N° FAC-2026-001</span>
                  </div>
                  <div style={{ border: `1px solid ${primaryColor}30`, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ backgroundColor: primaryColor, color: autoTextColor, fontSize: 8, padding: "4px 10px", display: "flex", justifyContent: "space-between" }}>
                      <span>Désignation</span><span>Total</span>
                    </div>
                    <div style={{ fontSize: 8, padding: "5px 10px", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${primaryColor}15` }}>
                      <span>Prestation ménage</span><span>120,00 €</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, borderTop: `2px solid ${accentColor}`, paddingTop: 4 }}>
                    <span style={{ fontSize: 7, color: primaryColor, opacity: 0.6 }}>Document généré via MyWelkom</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inspection preview */}
          {previewTab === "inspection" && (
            <div className="rounded-lg border p-4 bg-white">
              <div className="rounded overflow-hidden border" style={{ maxWidth: 400 }}>
                <div style={{ backgroundColor: primaryColor, color: autoTextColor, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", borderBottom: `2px solid ${accentColor}`, paddingBottom: 2, display: "inline-block" }}>
                      {companyName}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", borderBottom: `2px solid ${accentColor}`, paddingBottom: 2, display: "inline-block" }}>
                      Nom Voyageur
                    </div>
                    <p style={{ fontSize: 8, opacity: 0.8, margin: "3px 0 0" }}>Villa Exemple</p>
                  </div>
                </div>
                <div style={{ padding: "10px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 3, height: 20, backgroundColor: accentColor, borderRadius: 1 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: primaryColor, textTransform: "uppercase", letterSpacing: 1 }}>État des lieux d'entrée</span>
                  </div>
                  <div style={{ border: `1px solid ${primaryColor}30`, borderRadius: 3, overflow: "hidden", fontSize: 8 }}>
                    <div style={{ backgroundColor: primaryColor, color: autoTextColor, padding: "4px 10px", display: "flex" }}>
                      <span style={{ width: "35%" }}>Information</span><span>Détail</span>
                    </div>
                    <div style={{ padding: "4px 10px", borderBottom: `1px solid ${primaryColor}10`, display: "flex" }}>
                      <span style={{ width: "35%", fontWeight: 600 }}>Bien</span><span>Villa Exemple</span>
                    </div>
                    <div style={{ padding: "4px 10px", display: "flex" }}>
                      <span style={{ width: "35%", fontWeight: 600 }}>Voyageur</span><span>Jean Dupont</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 7, fontWeight: 700, color: primaryColor, textTransform: "uppercase", borderBottom: `2px solid ${accentColor}`, paddingBottom: 2, marginBottom: 4 }}>Signature concierge</div>
                      <div style={{ height: 30, border: "1px dashed #d1d5db", borderRadius: 3 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 7, fontWeight: 700, color: primaryColor, textTransform: "uppercase", borderBottom: `2px solid ${accentColor}`, paddingBottom: 2, marginBottom: 4 }}>Signature client</div>
                      <div style={{ height: 30, border: "1px dashed #d1d5db", borderRadius: 3 }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 8, borderTop: `2px solid ${accentColor}`, paddingTop: 4 }}>
                    <span style={{ fontSize: 7, color: primaryColor, opacity: 0.6 }}>Document généré via MyWelkom</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booklet preview */}
          {previewTab === "booklet" && (
            <div className="rounded-lg border p-4 bg-white">
              <div className="rounded overflow-hidden border" style={{ maxWidth: 400 }}>
                <div style={{ backgroundColor: primaryColor, color: autoTextColor, padding: "20px 18px", textAlign: "center" }}>
                  {logoUrl && <img src={logoUrl} alt="" style={{ maxHeight: 36, margin: "0 auto 8px" }} />}
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
                    Bienvenue
                  </div>
                  <div style={{ width: 40, height: 2, backgroundColor: accentColor, margin: "6px auto" }} />
                  <p style={{ fontSize: 9, opacity: 0.8 }}>Villa Exemple · {city}</p>
                </div>
                <div style={{ padding: "12px 18px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {["WiFi", "Check-in", "Équipements"].map(t => (
                      <div key={t} style={{ flex: 1, padding: "8px 6px", borderRadius: 6, border: `1px solid ${primaryColor}20`, textAlign: "center" }}>
                        <span style={{ fontSize: 8, fontWeight: 600, color: primaryColor }}>{t}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `2px solid ${accentColor}`, paddingTop: 6 }}>
                    <span style={{ fontSize: 7, color: primaryColor, opacity: 0.6 }}>Propulsé par MyWelkom · {companyName}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

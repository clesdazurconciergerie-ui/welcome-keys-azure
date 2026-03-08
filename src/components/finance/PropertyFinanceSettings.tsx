import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePropertyFinancialSettings } from "@/hooks/useFinancialSettings";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Save, Loader2, Plus, Euro, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const compensationModels = [
  { value: "percentage", label: "Commission (%)" },
  { value: "fixed", label: "Forfait mensuel" },
  { value: "per_task", label: "Par prestation" },
  { value: "hybrid", label: "Hybride" },
];

interface Props {
  propertyId: string;
}

export function PropertyFinanceSettings({ propertyId }: Props) {
  const { settings, loading: sLoading, saveSettings } = usePropertyFinancialSettings(propertyId);
  const { bookings, loading: bLoading, createBooking, updateBooking, deleteBooking } = useBookings(propertyId);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    compensation_model: "percentage",
    commission_rate: 20,
    cleaning_fee: 0,
    checkin_fee: 0,
    maintenance_rate: 0,
    ota_payout_recipient: "owner",
    pricing_source: "manual",
    linen_price_per_person: 0,
  });

  // Booking creation
  const [bkOpen, setBkOpen] = useState(false);
  const [bkForm, setBkForm] = useState({ check_in: "", check_out: "", guest_name: "", gross_amount: "", source: "manual" });

  useEffect(() => {
    if (settings) {
      setForm({
        compensation_model: settings.compensation_model || "percentage",
        commission_rate: settings.commission_rate || 20,
        cleaning_fee: settings.cleaning_fee || 0,
        checkin_fee: settings.checkin_fee || 0,
        maintenance_rate: settings.maintenance_rate || 0,
        ota_payout_recipient: settings.ota_payout_recipient || "owner",
        pricing_source: settings.pricing_source || "manual",
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(form);
    setSaving(false);
  };

  const handleCreateBooking = async () => {
    const gross = parseFloat(bkForm.gross_amount) || 0;
    const commissionAmount = gross * (form.commission_rate / 100);
    const cleaningAmount = form.cleaning_fee;
    const checkinAmount = form.checkin_fee;
    const maintenanceAmount = gross * (form.maintenance_rate / 100);
    const ownerNet = gross - commissionAmount - cleaningAmount - checkinAmount - maintenanceAmount;
    const conciergeRevenue = commissionAmount + cleaningAmount + checkinAmount;

    await createBooking({
      property_id: propertyId,
      check_in: bkForm.check_in,
      check_out: bkForm.check_out,
      guest_name: bkForm.guest_name || null,
      source: bkForm.source,
      gross_amount: gross || null,
      commission_amount: commissionAmount,
      cleaning_amount: cleaningAmount,
      checkin_amount: checkinAmount,
      maintenance_amount: maintenanceAmount,
      owner_net: ownerNet,
      concierge_revenue: conciergeRevenue,
      price_status: gross > 0 ? "complete" : "missing",
      financial_status: "pending",
    });
    setBkForm({ check_in: "", check_out: "", guest_name: "", gross_amount: "", source: "manual" });
    setBkOpen(false);
  };

  const statusColors: Record<string, string> = {
    complete: "bg-emerald-100 text-emerald-700",
    missing: "bg-amber-100 text-amber-700",
    invoiced: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Financial config */}
      <Card>
        <CardHeader><CardTitle className="text-base">Configuration financière</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Modèle de rémunération</Label>
              <Select value={form.compensation_model} onValueChange={v => setForm(f => ({ ...f, compensation_model: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{compensationModels.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Commission (%)</Label><Input type="number" step="0.1" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Ménage (€)</Label><Input type="number" step="0.01" value={form.cleaning_fee} onChange={e => setForm(f => ({ ...f, cleaning_fee: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Check-in (€)</Label><Input type="number" step="0.01" value={form.checkin_fee} onChange={e => setForm(f => ({ ...f, checkin_fee: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Maintenance (%)</Label><Input type="number" step="0.1" value={form.maintenance_rate} onChange={e => setForm(f => ({ ...f, maintenance_rate: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Qui reçoit le paiement OTA</Label>
              <Select value={form.ota_payout_recipient} onValueChange={v => setForm(f => ({ ...f, ota_payout_recipient: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propriétaire</SelectItem>
                  <SelectItem value="concierge">Conciergerie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source prix par défaut</Label>
              <Select value={form.pricing_source} onValueChange={v => setForm(f => ({ ...f, pricing_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Saisie manuelle</SelectItem>
                  <SelectItem value="calendar">Calendrier tarifaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Réservations</CardTitle>
          <Dialog open={bkOpen} onOpenChange={setBkOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]">
                <Plus className="h-4 w-4" />Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle réservation</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Check-in</Label><Input type="date" value={bkForm.check_in} onChange={e => setBkForm(f => ({ ...f, check_in: e.target.value }))} /></div>
                  <div><Label>Check-out</Label><Input type="date" value={bkForm.check_out} onChange={e => setBkForm(f => ({ ...f, check_out: e.target.value }))} /></div>
                </div>
                <div><Label>Nom du voyageur</Label><Input value={bkForm.guest_name} onChange={e => setBkForm(f => ({ ...f, guest_name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Montant brut (€)</Label><Input type="number" step="0.01" value={bkForm.gross_amount} onChange={e => setBkForm(f => ({ ...f, gross_amount: e.target.value }))} placeholder="Laisser vide = Prix manquant" /></div>
                  <div><Label>Source</Label>
                    <Select value={bkForm.source} onValueChange={v => setBkForm(f => ({ ...f, source: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manuel</SelectItem>
                        <SelectItem value="airbnb">Airbnb</SelectItem>
                        <SelectItem value="booking">Booking.com</SelectItem>
                        <SelectItem value="abritel">Abritel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateBooking} disabled={!bkForm.check_in || !bkForm.check_out} className="w-full">Créer la réservation</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {bLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune réservation enregistrée</p>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3 min-w-0">
                    {b.price_status === "missing" ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" /> : <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{format(new Date(b.check_in), "dd/MM")} → {format(new Date(b.check_out), "dd/MM/yyyy")}{b.guest_name ? ` • ${b.guest_name}` : ""}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[9px]">{b.source}</Badge>
                        <Badge className={`text-[9px] ${statusColors[b.price_status] || ""}`}>{b.price_status === "missing" ? "Prix manquant" : b.price_status === "complete" ? "Complet" : b.price_status}</Badge>
                        <Badge className={`text-[9px] ${statusColors[b.financial_status] || ""}`}>{b.financial_status === "pending" ? "En attente" : b.financial_status === "invoiced" ? "Facturé" : "Payé"}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold">{b.gross_amount ? `${Number(b.gross_amount).toLocaleString("fr-FR")} €` : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Net: {Number(b.owner_net).toLocaleString("fr-FR")} €</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBooking(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

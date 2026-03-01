import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useInvoices } from "@/hooks/useInvoices";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useFinancialSettings, usePropertyFinancialSettings } from "@/hooks/useFinancialSettings";
import { useOwners } from "@/hooks/useOwners";
import { useProperties } from "@/hooks/useProperties";
import { Plus, FileText, Printer, Trash2, CheckCircle, Clock, X, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoicePrintView } from "./InvoicePrintView";
import { supabase } from "@/integrations/supabase/client";

// --- Types ---
interface ServiceLine {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface SelectedBookingCalc {
  booking: Booking;
  gross: number;
  commission: number;
  cleaning: number;
  checkin: number;
  maintenance: number;
  ownerNet: number;
  conciergeRevenue: number;
}

// --- Main component ---
export function FinanceInvoicesTab() {
  const { invoices, loading, generateInvoice, updateInvoiceStatus, deleteInvoice, fetchInvoiceWithItems } = useInvoices();
  const { bookings } = useBookings();
  const { settings: fs } = useFinancialSettings();
  const { owners } = useOwners();
  const { properties } = useProperties();

  // Dialog states
  const [genOpen, setGenOpen] = useState(false);
  const [genOwner, setGenOwner] = useState("");
  const [genMonth, setGenMonth] = useState(format(new Date(), "yyyy-MM"));
  const [generating, setGenerating] = useState(false);

  // Selection
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);

  // Property financial settings cache
  const [propFinSettings, setPropFinSettings] = useState<Record<string, any>>({});

  // Preview
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load owner's property IDs
  const [ownerPropertyIds, setOwnerPropertyIds] = useState<string[]>([]);
  useEffect(() => {
    if (!genOwner) { setOwnerPropertyIds([]); return; }
    (async () => {
      const { data } = await supabase
        .from("owner_properties" as any)
        .select("property_id")
        .eq("owner_id", genOwner);
      const ids = (data as any[] || []).map((d: any) => d.property_id);
      setOwnerPropertyIds(ids);

      // Fetch financial settings for each property
      const settingsMap: Record<string, any> = {};
      for (const pid of ids) {
        const { data: pfs } = await supabase
          .from("property_financial_settings" as any)
          .select("*")
          .eq("property_id", pid)
          .maybeSingle();
        if (pfs) settingsMap[pid] = pfs;
      }
      setPropFinSettings(settingsMap);
    })();
  }, [genOwner]);

  // Filter bookings for selected owner & month
  const filteredBookings = useMemo(() => {
    if (!genOwner || ownerPropertyIds.length === 0) return [];
    const [y, m] = genMonth.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));
    return bookings.filter(b => {
      const d = new Date(b.check_in);
      return ownerPropertyIds.includes(b.property_id) && d >= start && d <= end;
    });
  }, [bookings, genOwner, ownerPropertyIds, genMonth]);

  // Reset selections when owner/month changes
  useEffect(() => {
    setSelectedBookingIds(new Set());
    setServiceLines([]);
  }, [genOwner, genMonth]);

  // Calculate amounts per selected booking using property financial settings
  const selectedCalcs: SelectedBookingCalc[] = useMemo(() => {
    return filteredBookings
      .filter(b => selectedBookingIds.has(b.id))
      .map(b => {
        const pfs = propFinSettings[b.property_id];
        const gross = Number(b.gross_amount) || 0;
        const commissionRate = pfs?.commission_rate ?? 20;
        const cleaningFee = Number(pfs?.cleaning_fee ?? 0);
        const checkinFee = Number(pfs?.checkin_fee ?? 0);
        const maintenanceRate = pfs?.maintenance_rate ?? 0;

        const commission = gross * (commissionRate / 100);
        const maintenance = gross * (maintenanceRate / 100);
        const conciergeRevenue = commission + cleaningFee + checkinFee;
        const ownerNet = gross - commission - cleaningFee - checkinFee - maintenance;

        return {
          booking: b,
          gross,
          commission,
          cleaning: cleaningFee,
          checkin: checkinFee,
          maintenance,
          ownerNet: Math.max(0, ownerNet),
          conciergeRevenue,
        };
      });
  }, [filteredBookings, selectedBookingIds, propFinSettings]);

  // Totals
  const serviceLinesTotal = serviceLines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const bookingsSubtotal = selectedCalcs.reduce((s, c) => s + c.ownerNet, 0);
  const subtotal = bookingsSubtotal + serviceLinesTotal;
  const vatRate = fs?.default_vat_rate || 0;
  const vatAmount = subtotal * (vatRate / 100);
  const totalTTC = subtotal + vatAmount;

  // Toggle booking
  const toggleBooking = (id: string) => {
    setSelectedBookingIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllBookings = () => {
    if (selectedBookingIds.size === filteredBookings.length) {
      setSelectedBookingIds(new Set());
    } else {
      setSelectedBookingIds(new Set(filteredBookings.map(b => b.id)));
    }
  };

  // Service lines
  const addServiceLine = () => {
    setServiceLines(prev => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1, unit_price: 0 }]);
  };

  const updateServiceLine = (id: string, field: keyof ServiceLine, value: any) => {
    setServiceLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeServiceLine = (id: string) => {
    setServiceLines(prev => prev.filter(l => l.id !== id));
  };

  // Suggest interventions as services
  const [suggestedServices, setSuggestedServices] = useState<any[]>([]);
  useEffect(() => {
    if (ownerPropertyIds.length === 0) { setSuggestedServices([]); return; }
    const [y, m] = genMonth.split("-").map(Number);
    const start = format(startOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
    const end = format(endOfMonth(new Date(y, m - 1)), "yyyy-MM-dd");
    (async () => {
      const { data } = await supabase
        .from("cleaning_interventions" as any)
        .select("*, property:properties(name)")
        .in("property_id", ownerPropertyIds)
        .gte("scheduled_date", start)
        .lte("scheduled_date", end)
        .eq("status", "completed");
      setSuggestedServices((data as any[]) || []);
    })();
  }, [ownerPropertyIds, genMonth]);

  const addSuggestedService = (s: any) => {
    const exists = serviceLines.some(l => l.description.includes(s.id));
    if (exists) return;
    setServiceLines(prev => [...prev, {
      id: crypto.randomUUID(),
      description: `${s.mission_type === 'cleaning' ? 'Ménage' : s.mission_type} — ${s.property?.name || ''} (${format(new Date(s.scheduled_date), "dd/MM/yyyy")})`,
      quantity: 1,
      unit_price: Number(s.mission_amount) || 0,
    }]);
  };

  // Generate
  const handleGenerate = async () => {
    if (selectedCalcs.length === 0 && serviceLines.length === 0) return;
    const owner = owners.find(o => o.id === genOwner);
    if (!owner) return;

    const [y, m] = genMonth.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));

    // Build items
    const items: any[] = [];
    for (const c of selectedCalcs) {
      items.push({
        booking_id: c.booking.id,
        description: `Réservation ${c.booking.check_in} → ${c.booking.check_out}${c.booking.guest_name ? ` (${c.booking.guest_name})` : ""} — Net propriétaire`,
        quantity: 1,
        unit_price: c.ownerNet,
        total: c.ownerNet,
        item_type: "revenue",
      });
    }
    for (const sl of serviceLines) {
      if (!sl.description) continue;
      items.push({
        booking_id: null,
        description: sl.description,
        quantity: sl.quantity,
        unit_price: sl.unit_price,
        total: sl.quantity * sl.unit_price,
        item_type: "service",
      });
    }

    setGenerating(true);
    await generateInvoice({
      owner_id: genOwner,
      period_start: format(start, "yyyy-MM-dd"),
      period_end: format(end, "yyyy-MM-dd"),
      bookings: selectedCalcs.map(c => c.booking),
      financial_settings: fs,
      owner,
      vat_rate: vatRate,
      custom_items: items,
      custom_subtotal: subtotal,
    });
    setGenerating(false);
    setGenOpen(false);
  };

  const handlePreview = async (invoiceId: string) => {
    const { invoice, items } = await fetchInvoiceWithItems(invoiceId);
    setPreviewInvoice(invoice);
    setPreviewItems(items);
    setPreviewOpen(true);
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: fr }) };
  });

  const getPropertyName = (pid: string) => properties.find(p => p.id === pid)?.name || "";

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Factures</h2>
        <Dialog open={genOpen} onOpenChange={setGenOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-dark))] text-white">
              <Plus className="h-4 w-4" />Générer une facture
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Step 1: Owner + Month */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Propriétaire</Label>
                  <Select value={genOwner} onValueChange={setGenOwner}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.first_name} {o.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Période</Label>
                  <Select value={genMonth} onValueChange={setGenMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {genOwner && (
                <>
                  <Separator />

                  {/* Step 2: Select bookings */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Réservations ({filteredBookings.length})
                      </Label>
                      {filteredBookings.length > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllBookings}>
                          {selectedBookingIds.size === filteredBookings.length ? "Tout désélectionner" : "Tout sélectionner"}
                        </Button>
                      )}
                    </div>

                    {filteredBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-3 text-center">Aucune réservation trouvée pour cette période</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {filteredBookings.map(b => {
                          const selected = selectedBookingIds.has(b.id);
                          const pfs = propFinSettings[b.property_id];
                          const gross = Number(b.gross_amount) || 0;
                          const propName = getPropertyName(b.property_id);
                          return (
                            <div
                              key={b.id}
                              onClick={() => toggleBooking(b.id)}
                              className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox checked={selected} onCheckedChange={() => toggleBooking(b.id)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {propName} — {b.guest_name || "Voyageur"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(b.check_in), "dd/MM")} → {format(new Date(b.check_out), "dd/MM")} · {b.source}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">{gross.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
                                {pfs && <p className="text-[10px] text-muted-foreground">Commission {pfs.commission_rate}%</p>}
                                {b.financial_status === "invoiced" && <Badge variant="secondary" className="text-[10px] mt-0.5">Déjà facturée</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Auto-calc summary for selected bookings */}
                  {selectedCalcs.length > 0 && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-3 text-xs space-y-1">
                        <p className="font-semibold text-sm mb-1">Détail calcul automatique</p>
                        {selectedCalcs.map(c => (
                          <div key={c.booking.id} className="flex justify-between">
                            <span className="text-muted-foreground truncate mr-2">
                              {getPropertyName(c.booking.property_id)} — {c.booking.guest_name || "Voyageur"}
                            </span>
                            <span className="shrink-0">
                              Brut {c.gross.toFixed(2)}€ → Net {c.ownerNet.toFixed(2)}€
                              <span className="text-muted-foreground ml-1">(com. {c.commission.toFixed(0)}€ + mén. {c.cleaning.toFixed(0)}€ + CI {c.checkin.toFixed(0)}€)</span>
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Separator />

                  {/* Step 3: Services / Prestations */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Prestations & Services
                      </Label>
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={addServiceLine}>
                        <Plus className="h-3 w-3" />Ajouter
                      </Button>
                    </div>

                    {/* Suggested services */}
                    {suggestedServices.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[11px] text-muted-foreground mb-1">💡 Prestations réalisées ce mois :</p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedServices.map(s => (
                            <button
                              key={s.id}
                              onClick={() => addSuggestedService(s)}
                              className="text-[11px] px-2 py-1 rounded-lg border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                            >
                              + {s.mission_type === 'cleaning' ? 'Ménage' : s.mission_type} — {s.property?.name} ({Number(s.mission_amount || 0).toFixed(0)}€)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {serviceLines.length > 0 && (
                      <div className="space-y-2">
                        {serviceLines.map(line => (
                          <div key={line.id} className="flex items-center gap-2">
                            <Input
                              placeholder="Description"
                              value={line.description}
                              onChange={e => updateServiceLine(line.id, "description", e.target.value)}
                              className="flex-1 h-8 text-xs"
                            />
                            <Input
                              type="number"
                              value={line.quantity}
                              onChange={e => updateServiceLine(line.id, "quantity", Number(e.target.value) || 0)}
                              className="w-16 h-8 text-xs text-center"
                              min={1}
                            />
                            <Input
                              type="number"
                              value={line.unit_price}
                              onChange={e => updateServiceLine(line.id, "unit_price", Number(e.target.value) || 0)}
                              className="w-24 h-8 text-xs text-right"
                              step="0.01"
                              placeholder="P.U. €"
                            />
                            <span className="text-xs font-medium w-16 text-right shrink-0">
                              {(line.quantity * line.unit_price).toFixed(2)}€
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeServiceLine(line.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sous-total réservations</span>
                      <span className="font-medium">{bookingsSubtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                    </div>
                    {serviceLinesTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prestations</span>
                        <span className="font-medium">{serviceLinesTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sous-total HT</span>
                      <span className="font-medium">{subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                    </div>
                    {vatRate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>TVA ({vatRate}%)</span>
                        <span>{vatAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t pt-2 mt-1">
                      <span>Total TTC</span>
                      <span>{totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || (selectedCalcs.length === 0 && serviceLines.length === 0)}
                    className="w-full gap-2"
                  >
                    {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {generating ? "Génération..." : "Générer la facture"}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoice list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune facture générée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <Card key={inv.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <FileText className="h-5 w-5 text-[hsl(var(--gold))] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.owner?.first_name} {inv.owner?.last_name} — {format(new Date(inv.period_start), "MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold">{Number(inv.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
                  <Badge variant={inv.status === "paid" ? "default" : "secondary"} className={inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {inv.status === "paid" ? "Payée" : "En attente"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(inv.id)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => updateInvoiceStatus(inv.id, inv.status === "paid" ? "pending" : "paid")}>
                    {inv.status === "paid" ? <Clock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteInvoice(inv.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Print preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Facture {previewInvoice?.invoice_number}</span>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />Imprimer / PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewInvoice && <InvoicePrintView invoice={previewInvoice} items={previewItems} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

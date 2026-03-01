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
import { useInvoices, type InvoiceItem } from "@/hooks/useInvoices";
import { useBookings, type Booking } from "@/hooks/useBookings";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useOwners } from "@/hooks/useOwners";
import { useProperties } from "@/hooks/useProperties";
import { useServicesCatalog } from "@/hooks/useServicesCatalog";
import { Plus, FileText, Printer, Trash2, CheckCircle, Clock, X, Loader2, Send, Ban, CreditCard } from "lucide-react";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoicePrintView } from "./InvoicePrintView";
import { supabase } from "@/integrations/supabase/client";
import { formatEUR, invoiceStatusLabels, invoiceStatusColors, lineTypeLabels } from "@/lib/finance-utils";

// Line item for the creation form
interface FormLine {
  id: string;
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  booking_id: string | null;
  property_id: string | null;
}

export function FinanceInvoicesTab() {
  const { invoices, loading, createInvoice, updateInvoiceStatus, deleteInvoice, fetchInvoiceWithItems } = useInvoices();
  const { bookings } = useBookings();
  const { settings: fs } = useFinancialSettings();
  const { owners } = useOwners();
  const { properties } = useProperties();
  const { services: catalog } = useServicesCatalog();

  // Filter state
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOwner, setFilterOwner] = useState("all");

  // Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [genOwner, setGenOwner] = useState("");
  const [genMonth, setGenMonth] = useState(format(new Date(), "yyyy-MM"));
  const [dueDate, setDueDate] = useState("");
  const [invoiceType, setInvoiceType] = useState("invoice");
  const [invoiceStatus, setInvoiceStatus] = useState("draft");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Lines
  const [lines, setLines] = useState<FormLine[]>([]);

  // Selection helpers
  const [ownerPropertyIds, setOwnerPropertyIds] = useState<string[]>([]);
  const [propFinSettings, setPropFinSettings] = useState<Record<string, any>>({});

  // Preview
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load owner property IDs & financial settings
  useEffect(() => {
    if (!genOwner) { setOwnerPropertyIds([]); return; }
    (async () => {
      const { data } = await supabase
        .from("owner_properties" as any)
        .select("property_id")
        .eq("owner_id", genOwner);
      const ids = (data as any[] || []).map((d: any) => d.property_id);
      setOwnerPropertyIds(ids);

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

  // Set due date default
  useEffect(() => {
    if (createOpen && fs?.default_due_days) {
      setDueDate(format(addDays(new Date(), fs.default_due_days), "yyyy-MM-dd"));
    }
  }, [createOpen, fs]);

  // Filtered bookings for selection
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

  // Reset when owner/month changes
  useEffect(() => {
    setLines([]);
  }, [genOwner, genMonth]);

  // Import reservation as line
  const importBooking = (b: Booking) => {
    if (lines.some(l => l.booking_id === b.id)) return;
    const pfs = propFinSettings[b.property_id];
    const gross = Number(b.gross_amount) || 0;
    const commRate = pfs?.commission_rate ?? 20;
    const cleanFee = Number(pfs?.cleaning_fee ?? 0);
    const checkinFee = Number(pfs?.checkin_fee ?? 0);
    const maintRate = pfs?.maintenance_rate ?? 0;
    const commission = gross * (commRate / 100);
    const maintenance = gross * (maintRate / 100);
    const ownerNet = gross - commission - cleanFee - checkinFee - maintenance;

    setLines(prev => [...prev, {
      id: crypto.randomUUID(),
      line_type: "rental_reservation",
      description: `Réservation ${b.check_in} → ${b.check_out}${b.guest_name ? ` (${b.guest_name})` : ""} — Net propriétaire`,
      quantity: 1,
      unit_price: Math.max(0, ownerNet),
      vat_rate: fs?.default_vat_rate || 0,
      booking_id: b.id,
      property_id: b.property_id,
    }]);
  };

  // Add empty line of a given type
  const addLine = (type: string) => {
    setLines(prev => [...prev, {
      id: crypto.randomUUID(),
      line_type: type,
      description: "",
      quantity: 1,
      unit_price: 0,
      vat_rate: fs?.default_vat_rate || 0,
      booking_id: null,
      property_id: null,
    }]);
  };

  // Add from catalog
  const addCatalogService = (svc: any) => {
    setLines(prev => [...prev, {
      id: crypto.randomUUID(),
      line_type: "service",
      description: svc.name,
      quantity: 1,
      unit_price: Number(svc.default_unit_price),
      vat_rate: Number(svc.default_vat_rate) || 0,
      booking_id: null,
      property_id: null,
    }]);
  };

  const updateLine = (id: string, field: keyof FormLine, value: any) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // Totals
  const subtotalHT = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const totalVAT = lines.reduce((s, l) => {
    const ht = l.quantity * l.unit_price;
    return s + ht * (l.vat_rate / 100);
  }, 0);
  const totalTTC = subtotalHT + totalVAT;

  // Group lines by type for display
  const lineGroups = useMemo(() => {
    const groups: Record<string, FormLine[]> = {};
    for (const l of lines) {
      if (!groups[l.line_type]) groups[l.line_type] = [];
      groups[l.line_type].push(l);
    }
    return groups;
  }, [lines]);

  // Create invoice
  const handleCreate = async () => {
    if (lines.length === 0) return;
    const owner = owners.find(o => o.id === genOwner);
    if (!owner) return;

    const [y, m] = genMonth.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));

    setCreating(true);
    await createInvoice({
      owner_id: genOwner,
      period_start: format(start, "yyyy-MM-dd"),
      period_end: format(end, "yyyy-MM-dd"),
      due_date: dueDate || undefined,
      type: invoiceType,
      status: invoiceStatus,
      vat_rate: fs?.default_vat_rate || 0,
      items: lines.map(l => ({
        booking_id: l.booking_id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total: l.quantity * l.unit_price,
        item_type: l.line_type === "rental_reservation" || l.line_type === "rental_manual" ? "revenue" : l.line_type,
        line_type: l.line_type,
        vat_rate: l.vat_rate,
        property_id: l.property_id,
        metadata: {},
      })),
      financial_settings: fs,
      owner,
      notes: invoiceNotes || undefined,
    });
    setCreating(false);
    setCreateOpen(false);
    setLines([]);
    setInvoiceNotes("");
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

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterOwner !== "all" && inv.owner_id !== filterOwner) return false;
    return true;
  });

  return (
    <div className="space-y-6 mt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyée</SelectItem>
              <SelectItem value="paid">Payée</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="canceled">Annulée</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Propriétaire" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.first_name} {o.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nouvelle facture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>

            <div className="space-y-5 mt-2">
              {/* Header fields */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Propriétaire *</Label>
                  <Select value={genOwner} onValueChange={setGenOwner}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.first_name} {o.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Période *</Label>
                  <Select value={genMonth} onValueChange={setGenMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Échéance</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select value={invoiceType} onValueChange={setInvoiceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Facture</SelectItem>
                      <SelectItem value="credit_note">Avoir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {genOwner && (
                <>
                  <Separator />

                  {/* Reservations section */}
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                      Réservations ({filteredBookings.length})
                    </Label>
                    {filteredBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">Aucune réservation pour cette période</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {filteredBookings.map(b => {
                          const imported = lines.some(l => l.booking_id === b.id);
                          const propName = properties.find(p => p.id === b.property_id)?.name || "";
                          return (
                            <div
                              key={b.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-sm ${imported ? "border-primary/30 bg-primary/5" : "border-border"}`}
                            >
                              <div className="min-w-0">
                                <span className="font-medium">{propName}</span>
                                <span className="text-muted-foreground ml-2">{b.guest_name || "—"}</span>
                                <span className="text-muted-foreground ml-2">{format(new Date(b.check_in), "dd/MM")} → {format(new Date(b.check_out), "dd/MM")}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{formatEUR(Number(b.gross_amount) || 0)}</span>
                                <Button
                                  variant={imported ? "secondary" : "outline"}
                                  size="sm" className="h-7 text-xs"
                                  onClick={() => importBooking(b)}
                                  disabled={imported}
                                >
                                  {imported ? "Importée" : "Importer"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Add line buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addLine("rental_manual")}>
                      <Plus className="h-3 w-3" />Revenu locatif manuel
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addLine("service")}>
                      <Plus className="h-3 w-3" />Prestation
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addLine("pass_through_cost")}>
                      <Plus className="h-3 w-3" />Frais refacturés
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => addLine("adjustment")}>
                      <Plus className="h-3 w-3" />Ajustement
                    </Button>
                  </div>

                  {/* Service catalog quick add */}
                  {catalog.filter(s => s.active).length > 0 && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">📋 Catalogue de services :</p>
                      <div className="flex flex-wrap gap-1.5">
                        {catalog.filter(s => s.active).map(svc => (
                          <button
                            key={svc.id}
                            onClick={() => addCatalogService(svc)}
                            className="text-[11px] px-2 py-1 rounded-lg border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                          >
                            + {svc.name} ({formatEUR(svc.default_unit_price)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lines editor */}
                  {Object.entries(lineGroups).map(([type, groupLines]) => (
                    <div key={type}>
                      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
                        {lineTypeLabels[type] || type}
                      </Label>
                      <div className="space-y-1.5">
                        {groupLines.map(line => (
                          <div key={line.id} className="flex items-center gap-2">
                            <Input
                              placeholder="Description"
                              value={line.description}
                              onChange={e => updateLine(line.id, "description", e.target.value)}
                              className="flex-1 h-8 text-xs"
                            />
                            <Input
                              type="number" min={1}
                              value={line.quantity}
                              onChange={e => updateLine(line.id, "quantity", Number(e.target.value) || 0)}
                              className="w-14 h-8 text-xs text-center"
                            />
                            <Input
                              type="number" step="0.01"
                              value={line.unit_price}
                              onChange={e => updateLine(line.id, "unit_price", Number(e.target.value) || 0)}
                              className="w-24 h-8 text-xs text-right"
                              placeholder="P.U."
                            />
                            <Input
                              type="number" step="0.1"
                              value={line.vat_rate}
                              onChange={e => updateLine(line.id, "vat_rate", Number(e.target.value) || 0)}
                              className="w-16 h-8 text-xs text-center"
                              placeholder="TVA%"
                            />
                            <span className="text-xs font-medium w-20 text-right shrink-0">
                              {formatEUR(line.quantity * line.unit_price)}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeLine(line.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sous-total HT</span>
                      <span className="font-medium">{formatEUR(subtotalHT)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>TVA</span>
                      <span>{formatEUR(totalVAT)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-2 mt-1">
                      <span>Total TTC</span>
                      <span>{formatEUR(totalTTC)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-xs">Notes internes (optionnel)</Label>
                    <Input value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} className="h-8 text-xs" placeholder="Notes..." />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={creating || lines.length === 0}
                      onClick={() => { setInvoiceStatus("draft"); handleCreate(); }}
                    >
                      Sauvegarder brouillon
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      disabled={creating || lines.length === 0}
                      onClick={() => { setInvoiceStatus("sent"); handleCreate(); }}
                    >
                      {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Send className="h-4 w-4" />Envoyer la facture
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">Aucune facture</p>
            <p className="text-sm text-muted-foreground mt-1">Créez votre première facture pour commencer</p>
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />Nouvelle facture
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredInvoices.map(inv => (
            <Card key={inv.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <FileText className={`h-5 w-5 shrink-0 ${inv.type === "credit_note" ? "text-red-400" : "text-primary"}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{inv.invoice_number}</p>
                      {inv.type === "credit_note" && <Badge variant="outline" className="text-[9px]">Avoir</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {inv.owner?.first_name} {inv.owner?.last_name} — {format(new Date(inv.period_start), "MMM yyyy", { locale: fr })}
                      {inv.due_date && <span className="ml-2">· Éch. {format(new Date(inv.due_date), "dd/MM/yyyy")}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatEUR(Number(inv.total))}</p>
                    <p className="text-[10px] text-muted-foreground">HT: {formatEUR(Number(inv.subtotal))}</p>
                  </div>
                  <Badge className={`text-[10px] ${invoiceStatusColors[inv.status] || ""}`}>
                    {invoiceStatusLabels[inv.status] || inv.status}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(inv.id)} title="Voir">
                      <Printer className="h-4 w-4" />
                    </Button>
                    {inv.status === "draft" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateInvoiceStatus(inv.id, "sent")} title="Envoyer">
                        <Send className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {["sent", "overdue"].includes(inv.status) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateInvoiceStatus(inv.id, "paid")} title="Marquer payée">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    {inv.status !== "canceled" && inv.status !== "paid" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateInvoiceStatus(inv.id, "canceled")} title="Annuler">
                        <Ban className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteInvoice(inv.id)} title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Print preview */}
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

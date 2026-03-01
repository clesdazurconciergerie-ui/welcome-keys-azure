import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInvoices } from "@/hooks/useInvoices";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useOwners } from "@/hooks/useOwners";
import { useProperties } from "@/hooks/useProperties";
import { useServicesCatalog } from "@/hooks/useServicesCatalog";
import { Plus, FileText, Printer, Trash2, CheckCircle, X, Loader2, Send, Ban, ChevronDown, Wrench, ArrowUpDown, Receipt, Home } from "lucide-react";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoicePrintView } from "./InvoicePrintView";
import { formatEUR, invoiceStatusLabels, invoiceStatusColors } from "@/lib/finance-utils";

// ── Location row (commission-based) ──
interface LocationRow {
  id: string;
  check_in: string;
  check_out: string;
  property_id: string;
  platform: string;
  rental_amount: number;
  commission_rate: number;
}

// ── Extra line ──
interface ExtraLine {
  id: string;
  type: "service" | "pass_through_cost" | "adjustment";
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

const extraTypeLabels: Record<string, string> = {
  service: "Prestation / Service",
  pass_through_cost: "Frais refacturés",
  adjustment: "Ajustement",
};
const extraTypeIcons: Record<string, React.ReactNode> = {
  service: <Wrench className="h-3.5 w-3.5" />,
  pass_through_cost: <Receipt className="h-3.5 w-3.5" />,
  adjustment: <ArrowUpDown className="h-3.5 w-3.5" />,
};

export function FinanceInvoicesTab() {
  const { invoices, loading, createInvoice, updateInvoiceStatus, deleteInvoice, fetchInvoiceWithItems } = useInvoices();
  const { settings: fs } = useFinancialSettings();
  const { owners } = useOwners();
  const { properties } = useProperties();
  const { services: catalog } = useServicesCatalog();

  const vatEnabled = fs?.vat_enabled ?? true;

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

  // Location rows
  const [locations, setLocations] = useState<LocationRow[]>([]);
  // Extra lines
  const [extras, setExtras] = useState<ExtraLine[]>([]);
  // Extra add modal
  const [extraModalType, setExtraModalType] = useState<"service" | "pass_through_cost" | "adjustment" | null>(null);
  const [extraForm, setExtraForm] = useState<Omit<ExtraLine, "id" | "type">>({ description: "", quantity: 1, unit_price: 0, vat_rate: vatEnabled ? (fs?.default_vat_rate || 20) : 0 });

  // Preview
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Set due date default
  useEffect(() => {
    if (createOpen && fs?.default_due_days) {
      setDueDate(format(addDays(new Date(), fs.default_due_days), "yyyy-MM-dd"));
    }
  }, [createOpen, fs]);

  // Reset when dialog opens/closes or owner changes
  useEffect(() => {
    setLocations([]);
    setExtras([]);
    setInvoiceNotes("");
  }, [genOwner, genMonth]);

  // ── Location helpers ──
  const addLocation = () => {
    setLocations(prev => [...prev, {
      id: crypto.randomUUID(),
      check_in: "",
      check_out: "",
      property_id: "",
      platform: "",
      rental_amount: 0,
      commission_rate: 20,
    }]);
  };

  const updateLocation = (id: string, field: keyof LocationRow, value: any) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  // ── Extra helpers ──
  const openExtraModal = (type: "service" | "pass_through_cost" | "adjustment") => {
    setExtraModalType(type);
    setExtraForm({ description: "", quantity: 1, unit_price: 0, vat_rate: vatEnabled ? (fs?.default_vat_rate || 20) : 0 });
  };

  const confirmExtra = () => {
    if (!extraModalType || !extraForm.description) return;
    setExtras(prev => [...prev, { id: crypto.randomUUID(), type: extraModalType, ...extraForm }]);
    setExtraModalType(null);
  };

  const removeExtra = (id: string) => {
    setExtras(prev => prev.filter(e => e.id !== id));
  };

  // ── Computed totals ──
  const totalCommissions = locations.reduce((s, l) => s + (l.rental_amount * l.commission_rate / 100), 0);
  const totalExtrasHT = extras.reduce((s, e) => s + e.quantity * e.unit_price, 0);
  const subtotalHT = totalCommissions + totalExtrasHT;
  const totalVAT = vatEnabled
    ? locations.reduce((s, l) => {
        const comm = l.rental_amount * l.commission_rate / 100;
        return s + comm * ((fs?.default_vat_rate || 20) / 100);
      }, 0) + extras.reduce((s, e) => s + e.quantity * e.unit_price * (e.vat_rate / 100), 0)
    : 0;
  const totalTTC = subtotalHT + totalVAT;

  // ── Create invoice ──
  const handleCreate = async () => {
    if (locations.length === 0 && extras.length === 0) return;
    const owner = owners.find(o => o.id === genOwner);
    if (!owner) return;

    const [y, m] = genMonth.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));

    const items = [
      ...locations.map(l => ({
        booking_id: null,
        description: `Location ${l.check_in || "—"} → ${l.check_out || "—"}${l.platform ? ` (${l.platform})` : ""}`,
        quantity: 1,
        unit_price: l.rental_amount * l.commission_rate / 100,
        total: l.rental_amount * l.commission_rate / 100,
        item_type: "revenue" as const,
        line_type: "rental_manual",
        vat_rate: vatEnabled ? (fs?.default_vat_rate || 20) : 0,
        property_id: l.property_id || null,
        metadata: { rental_amount: l.rental_amount, commission_rate: l.commission_rate, platform: l.platform },
      })),
      ...extras.map(e => ({
        booking_id: null,
        description: e.description,
        quantity: e.quantity,
        unit_price: e.unit_price,
        total: e.quantity * e.unit_price,
        item_type: e.type === "service" ? "revenue" : e.type,
        line_type: e.type,
        vat_rate: vatEnabled ? e.vat_rate : 0,
        property_id: null,
        metadata: {},
      })),
    ];

    setCreating(true);
    await createInvoice({
      owner_id: genOwner,
      period_start: format(start, "yyyy-MM-dd"),
      period_end: format(end, "yyyy-MM-dd"),
      due_date: dueDate || undefined,
      type: invoiceType,
      status: invoiceStatus,
      vat_rate: vatEnabled ? (fs?.default_vat_rate || 0) : 0,
      vatEnabled,
      items,
      financial_settings: fs,
      owner,
      notes: invoiceNotes || undefined,
    });
    setCreating(false);
    setCreateOpen(false);
    setLocations([]);
    setExtras([]);
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

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus !== "all" && inv.status !== filterStatus) return false;
    if (filterOwner !== "all" && inv.owner_id !== filterOwner) return false;
    return true;
  });

  const hasLines = locations.length > 0 || extras.length > 0;

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

        {/* ═══════════ NEW INVOICE DIALOG ═══════════ */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nouvelle facture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[1300px] w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
            {/* ── STICKY HEADER ── */}
            <div className="shrink-0 border-b bg-background px-6 py-4 space-y-4">
              <DialogHeader className="p-0">
                <DialogTitle className="text-lg">Nouvelle facture</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Propriétaire *</Label>
                  <Select value={genOwner} onValueChange={setGenOwner}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.first_name} {o.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Période *</Label>
                  <Select value={genMonth} onValueChange={setGenMonth}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Échéance</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={invoiceType} onValueChange={setInvoiceType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Facture</SelectItem>
                      <SelectItem value="credit_note">Avoir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── SCROLLABLE BODY ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {genOwner ? (
                <>
                  {/* ═══════════ LOCATIONS (COMMISSION) ═══════════ */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Locations (Commission)</h3>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addLocation}>
                        <Plus className="h-3 w-3" />Ajouter une location
                      </Button>
                    </div>

                    {locations.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 py-8 text-center">
                        <Home className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Aucune location ajoutée</p>
                        <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary" onClick={addLocation}>
                          + Ajouter une location
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-xl border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-9 px-3">Check-in</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-9 px-3">Check-out</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-9 px-3">Logement</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-9 px-3">Plateforme</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-9 px-3 text-right">Montant loc.</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-9 px-3 text-right">Comm. %</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-9 px-3 text-right">Commission €</TableHead>
                              <TableHead className="h-9 w-9 px-0" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {locations.map(loc => {
                              const commAmount = loc.rental_amount * loc.commission_rate / 100;
                              return (
                                <TableRow key={loc.id} className="group">
                                  <TableCell className="px-3 py-1.5">
                                    <Input type="date" value={loc.check_in} onChange={e => updateLocation(loc.id, "check_in", e.target.value)} className="h-8 text-xs w-[120px] border-transparent bg-transparent focus:bg-background focus:border-primary/20" />
                                  </TableCell>
                                  <TableCell className="px-3 py-1.5">
                                    <Input type="date" value={loc.check_out} onChange={e => updateLocation(loc.id, "check_out", e.target.value)} className="h-8 text-xs w-[120px] border-transparent bg-transparent focus:bg-background focus:border-primary/20" />
                                  </TableCell>
                                  <TableCell className="px-3 py-1.5">
                                    <Select value={loc.property_id || "none"} onValueChange={v => updateLocation(loc.id, "property_id", v === "none" ? "" : v)}>
                                      <SelectTrigger className="h-8 text-xs w-[140px] border-transparent bg-transparent focus:bg-background">
                                        <SelectValue placeholder="—" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="px-3 py-1.5">
                                    <Input placeholder="Airbnb, Booking…" value={loc.platform} onChange={e => updateLocation(loc.id, "platform", e.target.value)} className="h-8 text-xs w-[110px] border-transparent bg-transparent focus:bg-background focus:border-primary/20" />
                                  </TableCell>
                                  <TableCell className="px-3 py-1.5 text-right">
                                    <Input type="number" step="0.01" min={0} value={loc.rental_amount || ""} onChange={e => updateLocation(loc.id, "rental_amount", Number(e.target.value) || 0)} className="h-8 text-xs text-right w-[100px] ml-auto border-transparent bg-transparent focus:bg-background focus:border-primary/20" placeholder="0.00" />
                                  </TableCell>
                                  <TableCell className="px-3 py-1.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Input type="number" step="0.5" min={0} max={100} value={loc.commission_rate} onChange={e => updateLocation(loc.id, "commission_rate", Number(e.target.value) || 0)} className="h-8 text-xs text-right w-[60px] border-transparent bg-transparent focus:bg-background focus:border-primary/20" />
                                      <span className="text-xs text-muted-foreground">%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="px-3 py-1.5 text-right">
                                    <span className="text-sm font-semibold text-primary">{formatEUR(commAmount)}</span>
                                  </TableCell>
                                  <TableCell className="px-0 py-1.5">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => removeLocation(loc.id)}>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* ═══════════ EXTRAS ═══════════ */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Extras</h3>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                            <Plus className="h-3 w-3" />Ajouter…
                            <ChevronDown className="h-3 w-3 ml-0.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-1.5" align="end">
                          <button onClick={() => openExtraModal("service")} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left">
                            <Wrench className="h-4 w-4 text-muted-foreground" />Service / Prestation
                          </button>
                          <button onClick={() => openExtraModal("pass_through_cost")} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left">
                            <Receipt className="h-4 w-4 text-muted-foreground" />Frais refacturés
                          </button>
                          <button onClick={() => openExtraModal("adjustment")} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left">
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />Ajustement
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Catalog quick-add */}
                    {catalog.filter(s => s.active).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {catalog.filter(s => s.active).map(svc => (
                          <button
                            key={svc.id}
                            onClick={() => setExtras(prev => [...prev, { id: crypto.randomUUID(), type: "service", description: svc.name, quantity: 1, unit_price: Number(svc.default_unit_price), vat_rate: vatEnabled ? (Number(svc.default_vat_rate) || 20) : 0 }])}
                            className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                          >
                            + {svc.name} ({formatEUR(svc.default_unit_price)})
                          </button>
                        ))}
                      </div>
                    )}

                    {extras.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Aucun extra ajouté</p>
                    ) : (
                      <div className="space-y-1.5">
                        {extras.map(extra => (
                          <div key={extra.id} className="flex items-center gap-2 group rounded-lg border px-3 py-2">
                            <span className="shrink-0 text-muted-foreground">{extraTypeIcons[extra.type]}</span>
                            <Badge variant="outline" className="text-[9px] shrink-0">{extraTypeLabels[extra.type]}</Badge>
                            <span className="text-sm flex-1 truncate">{extra.description}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{extra.quantity} × {formatEUR(extra.unit_price)}</span>
                            {vatEnabled && <span className="text-xs text-muted-foreground shrink-0">TVA {extra.vat_rate}%</span>}
                            <span className="text-sm font-semibold shrink-0">{formatEUR(extra.quantity * extra.unit_price)}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0" onClick={() => removeExtra(extra.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* ═══════════ TOTALS ═══════════ */}
                  <div className="space-y-2 text-sm rounded-xl bg-muted/30 p-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total commissions</span>
                      <span className="font-medium">{formatEUR(totalCommissions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total extras</span>
                      <span className="font-medium">{formatEUR(totalExtrasHT)}</span>
                    </div>
                    <Separator className="my-1" />
                    {vatEnabled ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sous-total HT</span>
                          <span className="font-semibold">{formatEUR(subtotalHT)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>TVA</span>
                          <span>{formatEUR(totalVAT)}</span>
                        </div>
                        <Separator className="my-1" />
                        <div className="flex justify-between text-base font-bold">
                          <span>Total TTC</span>
                          <span className="text-primary">{formatEUR(totalTTC)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-base font-bold">
                        <span>Total à payer</span>
                        <span className="text-primary">{formatEUR(subtotalHT)}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Notes internes (optionnel)</Label>
                    <Input value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} className="h-9 text-sm" placeholder="Notes…" />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">Sélectionnez un propriétaire pour commencer</p>
                </div>
              )}
            </div>

            {/* ── STICKY FOOTER ── */}
            <div className="shrink-0 border-t bg-background px-6 py-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-10"
                disabled={creating || !hasLines}
                onClick={() => { setInvoiceStatus("draft"); handleCreate(); }}
              >
                Sauvegarder brouillon
              </Button>
              <Button
                className="flex-1 h-10 gap-2"
                disabled={creating || !hasLines}
                onClick={() => { setInvoiceStatus("sent"); handleCreate(); }}
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4" />Envoyer la facture
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ═══════════ EXTRA ADD MODAL ═══════════ */}
      <Dialog open={!!extraModalType} onOpenChange={open => { if (!open) setExtraModalType(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {extraModalType && extraTypeLabels[extraModalType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Description *</Label>
              <Input value={extraForm.description} onChange={e => setExtraForm(f => ({ ...f, description: e.target.value }))} className="h-9" placeholder="Ex: Ménage supplémentaire" />
            </div>
            <div className={`grid gap-3 ${vatEnabled ? "grid-cols-3" : "grid-cols-2"}`}>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantité</Label>
                <Input type="number" min={1} value={extraForm.quantity} onChange={e => setExtraForm(f => ({ ...f, quantity: Number(e.target.value) || 1 }))} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prix unitaire{vatEnabled ? " HT" : ""}</Label>
                <Input type="number" step="0.01" value={extraForm.unit_price || ""} onChange={e => setExtraForm(f => ({ ...f, unit_price: Number(e.target.value) || 0 }))} className="h-9" placeholder="0.00" />
              </div>
              {vatEnabled && (
                <div className="space-y-1.5">
                  <Label className="text-xs">TVA %</Label>
                  <Input type="number" step="0.5" value={extraForm.vat_rate} onChange={e => setExtraForm(f => ({ ...f, vat_rate: Number(e.target.value) || 0 }))} className="h-9" />
                </div>
              )}
            </div>
            <div className="text-right text-sm">
              Total{vatEnabled ? " HT" : ""}: <span className="font-semibold">{formatEUR(extraForm.quantity * extraForm.unit_price)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtraModalType(null)}>Annuler</Button>
            <Button onClick={confirmExtra} disabled={!extraForm.description}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    {vatEnabled && <p className="text-[10px] text-muted-foreground">HT: {formatEUR(Number(inv.subtotal))}</p>}
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

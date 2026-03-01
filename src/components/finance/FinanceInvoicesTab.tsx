import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInvoices } from "@/hooks/useInvoices";
import { useBookings } from "@/hooks/useBookings";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import { useOwners } from "@/hooks/useOwners";
import { Plus, FileText, Printer, Trash2, CheckCircle, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoicePrintView } from "./InvoicePrintView";

export function FinanceInvoicesTab() {
  const { invoices, loading, generateInvoice, updateInvoiceStatus, deleteInvoice, fetchInvoiceWithItems } = useInvoices();
  const { bookings } = useBookings();
  const { settings: fs } = useFinancialSettings();
  const { owners } = useOwners();
  const [genOwner, setGenOwner] = useState("");
  const [genMonth, setGenMonth] = useState(format(new Date(), "yyyy-MM"));
  const [generating, setGenerating] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleGenerate = async () => {
    if (!genOwner) return;
    const owner = owners.find(o => o.id === genOwner);
    if (!owner) return;

    const [y, m] = genMonth.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1));
    const end = endOfMonth(new Date(y, m - 1));

    // Find owner's properties
    const ownerBookings = bookings.filter(b => {
      const d = new Date(b.check_in);
      return d >= start && d <= end && b.financial_status !== "invoiced" && b.financial_status !== "paid";
    });
    // For simplicity, include all non-invoiced bookings in that period
    // In production, you'd filter by properties linked to this owner

    if (ownerBookings.length === 0) {
      const { toast } = await import("sonner");
      toast.error("Aucune réservation à facturer pour cette période");
      return;
    }

    setGenerating(true);
    await generateInvoice({
      owner_id: genOwner,
      period_start: format(start, "yyyy-MM-dd"),
      period_end: format(end, "yyyy-MM-dd"),
      bookings: ownerBookings,
      financial_settings: fs,
      owner,
      vat_rate: fs?.default_vat_rate || 0,
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

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Factures</h2>
        <Dialog open={genOpen} onOpenChange={setGenOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-[hsl(var(--gold))] hover:bg-[hsl(var(--gold))]/90 text-[hsl(var(--brand-blue))]">
              <Plus className="h-4 w-4" />Générer une facture
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Générer une facture</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium">Propriétaire</label>
                <Select value={genOwner} onValueChange={setGenOwner}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {owners.map(o => <SelectItem key={o.id} value={o.id}>{o.first_name} {o.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Mois</label>
                <Select value={genMonth} onValueChange={setGenMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={generating || !genOwner} className="w-full">
                {generating ? "Génération..." : "Générer la facture"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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

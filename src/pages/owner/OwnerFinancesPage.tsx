import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Euro, FileText, Download, Printer, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoicePrintView } from "@/components/finance/InvoicePrintView";

export default function OwnerFinancesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("current");
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Invoices visible to owner via RLS
      const { data: invData } = await supabase.from("invoices" as any).select("*").order("created_at", { ascending: false });
      setInvoices(invData || []);

      // Bookings visible to owner via RLS
      const { data: bkData } = await supabase.from("bookings" as any).select("*, property:properties(name)").order("check_in", { ascending: false });
      setBookings(bkData || []);

      setLoading(false);
    };
    fetchData();
  }, []);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "current") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === "last") return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
  }, [period]);

  const stats = useMemo(() => {
    const filtered = bookings.filter((b: any) => {
      const d = new Date(b.check_in);
      return d >= dateRange.start && d <= dateRange.end;
    });
    const gross = filtered.reduce((s: number, b: any) => s + (Number(b.gross_amount) || 0), 0);
    const deductions = filtered.reduce((s: number, b: any) => s + (Number(b.commission_amount) || 0) + (Number(b.cleaning_amount) || 0) + (Number(b.maintenance_amount) || 0), 0);
    const net = filtered.reduce((s: number, b: any) => s + (Number(b.owner_net) || 0), 0);
    return { gross, deductions, net };
  }, [bookings, dateRange]);

  const handlePreview = async (invoiceId: string) => {
    const { data: invoice } = await supabase.from("invoices" as any).select("*").eq("id", invoiceId).single();
    const { data: items } = await supabase.from("invoice_items" as any).select("*").eq("invoice_id", invoiceId);
    setPreviewInvoice(invoice);
    setPreviewItems(items || []);
    setPreviewOpen(true);
  };

  const exportCSV = () => {
    const headers = "Date,Bien,Brut,Déductions,Net\n";
    const rows = bookings.map((b: any) =>
      `${b.check_in},${(b.property as any)?.name || ""},${b.gross_amount || 0},${(Number(b.commission_amount) || 0) + (Number(b.cleaning_amount) || 0)},${b.owner_net || 0}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finances-${format(new Date(), "yyyy-MM")}.csv`; a.click();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes Finances</h1>
          <p className="text-sm text-muted-foreground mt-1">Suivez vos revenus et téléchargez vos factures</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Ce mois</SelectItem>
              <SelectItem value="last">Mois dernier</SelectItem>
              <SelectItem value="year">12 mois</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" />CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Revenu Brut</span>
              <Euro className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {loading ? "—" : `${stats.gross.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Déductions</span>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-500">
              {loading ? "—" : `-${stats.deductions.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Net à percevoir</span>
              <Euro className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {loading ? "—" : `${stats.net.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader><CardTitle className="text-base">Mes factures</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Chargement...</p> : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune facture disponible</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-[hsl(var(--gold))]" />
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(inv.period_start), "MMMM yyyy", { locale: fr })}</p>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

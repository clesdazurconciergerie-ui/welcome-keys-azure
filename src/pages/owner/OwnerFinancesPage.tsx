import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Printer, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { InvoicePrintView } from "@/components/finance/InvoicePrintView";
import { motion } from "framer-motion";

export default function OwnerFinancesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("invoices" as any).select("*").order("created_at", { ascending: false });
      setInvoices(data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handlePreview = async (invoiceId: string) => {
    const { data: invoice } = await supabase.from("invoices" as any).select("*").eq("id", invoiceId).single();
    const { data: items } = await supabase.from("invoice_items" as any).select("*").eq("invoice_id", invoiceId);
    setPreviewInvoice(invoice);
    setPreviewItems(items || []);
    setPreviewOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Mes Factures</h1>
        <p className="text-sm text-muted-foreground mt-1">Consultez et téléchargez vos factures</p>
      </motion.div>

      <Card className="border-border">
        <CardHeader><CardTitle className="text-base">Factures</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-[hsl(var(--gold))]" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Aucune facture</h3>
              <p className="text-sm text-muted-foreground">Vos factures apparaîtront ici une fois générées par votre conciergerie.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv: any, i: number) => (
                <motion.div key={inv.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[hsl(var(--gold))]" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(inv.period_start), "MMMM yyyy", { locale: fr })}
                          {inv.due_date && ` • Échéance: ${format(new Date(inv.due_date), "dd/MM/yyyy")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-foreground">{Number(inv.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</p>
                      <Badge variant="outline" className={inv.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                        {inv.status === "paid" ? "Payée" : "En attente"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(inv.id)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
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

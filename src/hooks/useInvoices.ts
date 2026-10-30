import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  user_id: string;
  owner_id: string;
  invoice_number: string;
  invoice_date: string;
  issue_date: string;
  due_date: string | null;
  period_start: string;
  period_end: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: string;
  type: string;
  notes: string | null;
  company_snapshot: any;
  owner_snapshot: any;
  pdf_path: string | null;
  generated_at: string | null;
  created_at: string;
  owner?: { first_name: string; last_name: string; email: string };
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  booking_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: string;
  line_type: string;
  vat_rate: number;
  property_id: string | null;
  metadata: any;
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    const { data, error } = await supabase
      .from("invoices" as any)
      .select("*, owner:owners(first_name, last_name, email)")
      .order("created_at", { ascending: false });
    if (!error) setInvoices((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const fetchInvoiceWithItems = async (invoiceId: string) => {
    const { data: invoice } = await supabase
      .from("invoices" as any)
      .select("*, owner:owners(first_name, last_name, email)")
      .eq("id", invoiceId)
      .single();
    const { data: items } = await supabase
      .from("invoice_items" as any)
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });
    return { invoice: invoice as any as Invoice, items: (items as any as InvoiceItem[]) || [] };
  };

  const prepareInvoice = async (params: {
    owner_id: string;
    period_start: string;
    period_end: string;
    due_date?: string;
    type?: string;
    vatEnabled?: boolean;
    items: Omit<InvoiceItem, "id" | "invoice_id">[];
    financial_settings: any;
  }) => {
    const vatEnabled = params.vatEnabled ?? true;
    if (!params.financial_settings?.invoice_rounding_policy) {
      toast.error("La règle d’arrondi doit être validée dans les paramètres Finance avant de préparer une facture.");
      return null;
    }
    if (params.items.some((item) => !item.property_id)) {
      toast.error("Chaque ligne doit être rattachée à un logement.");
      return null;
    }

    const money = (value: number) => Number(value).toFixed(2);
    const decimal = (value: number) => Number(value).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    const issueDate = new Date().toLocaleDateString("sv-SE");
    const draft = {
      owner_id: params.owner_id,
      issue_date: issueDate,
      due_date: params.due_date || null,
      period_start: params.period_start,
      period_end: params.period_end,
      type: params.type || "invoice",
      currency: "EUR",
      lines: params.items.map((item) => ({
        line_id: crypto.randomUUID(),
        booking_id: item.booking_id || null,
        property_id: item.property_id,
        line_type: item.line_type || "service",
        description: item.description.trim(),
        quantity: decimal(item.quantity),
        unit_price: money(item.unit_price),
        vat_rate: money(vatEnabled ? (item.vat_rate || 0) : 0),
      })),
    };

    const { data, error } = await supabase.functions.invoke("jarvis-invoice-creation", {
      body: { action: "prepare", draft },
    });
    if (error || data?.error || !data?.draft?.draft_id) {
      console.error("[Invoice] Server draft preparation failed", error || data?.error);
      toast.error("Le brouillon n’a pas été préparé. Aucune facture n’a été créée.");
      return null;
    }
    toast.success("Brouillon calculé. Vérifiez-le avant approbation.");
    return data.draft;
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    if (status === "sent") {
      window.location.assign(`/dashboard/finance/factures/deposer/${encodeURIComponent(id)}`);
      return;
    }
    const updatePayload: Record<string, any> = { status };
    if (status === "paid") {
      updatePayload.paid_at = new Date().toISOString();
    }
    if (status !== "paid") {
      updatePayload.paid_at = null;
    }
    const { error } = await supabase
      .from("invoices" as any)
      .update(updatePayload)
      .eq("id", id);
    if (error) { toast.error(`Erreur: ${error.message}`); return; }
    toast.success(status === "paid" ? "Facture marquée comme payée" : "Statut mis à jour");
    await fetchInvoices();
  };

  const updateInvoicePdf = async (id: string, pdfPath: string) => {
    await supabase
      .from("invoices" as any)
      .update({ pdf_path: pdfPath, generated_at: new Date().toISOString() })
      .eq("id", id);
    await fetchInvoices();
  };

  const deleteInvoice = async (id: string) => {
    await supabase.from("invoice_items" as any).delete().eq("invoice_id", id);
    const { error } = await supabase
      .from("invoices" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }
    toast.success("Facture supprimée");
    await fetchInvoices();
  };

  return { invoices, loading, prepareInvoice, updateInvoiceStatus, updateInvoicePdf, deleteInvoice, fetchInvoiceWithItems, refetch: fetchInvoices };
}

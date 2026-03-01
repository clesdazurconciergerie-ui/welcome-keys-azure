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

  const createInvoice = async (params: {
    owner_id: string;
    period_start: string;
    period_end: string;
    due_date?: string;
    type?: string;
    status?: string;
    vat_rate: number;
    items: Omit<InvoiceItem, "id" | "invoice_id">[];
    financial_settings: any;
    owner: any;
    notes?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fs = params.financial_settings;
    const prefix = fs?.invoice_prefix || "FAC";
    const nextNum = fs?.next_invoice_number || 1;
    const invoiceNumber = `${prefix}-${String(nextNum).padStart(5, "0")}`;

    // Compute totals from items
    const subtotal = params.items.reduce((s, item) => s + (item.quantity * item.unit_price), 0);
    const vatAmount = params.items.reduce((s, item) => {
      const lineTotal = item.quantity * item.unit_price;
      return s + lineTotal * ((item.vat_rate || 0) / 100);
    }, 0);
    const total = subtotal + vatAmount;

    const { data: invoice, error } = await supabase
      .from("invoices" as any)
      .insert({
        user_id: user.id,
        owner_id: params.owner_id,
        invoice_number: invoiceNumber,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: params.due_date || null,
        period_start: params.period_start,
        period_end: params.period_end,
        subtotal,
        vat_rate: params.vat_rate,
        vat_amount: vatAmount,
        total,
        type: params.type || "invoice",
        status: params.status || "draft",
        notes: params.notes || null,
        company_snapshot: fs ? {
          company_name: fs.company_name,
          address: fs.address,
          vat_number: fs.vat_number,
          iban: fs.iban,
          legal_footer: fs.legal_footer,
        } : null,
        owner_snapshot: {
          first_name: params.owner.first_name,
          last_name: params.owner.last_name,
          email: params.owner.email,
          phone: params.owner.phone,
        },
      })
      .select()
      .single();

    if (error) { toast.error("Erreur génération facture"); return null; }

    const invoiceId = (invoice as any).id;
    for (const item of params.items) {
      await supabase.from("invoice_items" as any).insert({
        invoice_id: invoiceId,
        booking_id: item.booking_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        item_type: item.item_type || "revenue",
        line_type: item.line_type || "rental_manual",
        vat_rate: item.vat_rate || 0,
        property_id: item.property_id || null,
        metadata: item.metadata || {},
      });
    }

    // Mark bookings as invoiced
    const bookingIds = params.items
      .filter(i => i.booking_id)
      .map(i => i.booking_id);
    for (const bid of bookingIds) {
      await supabase.from("bookings" as any).update({ financial_status: "invoiced" }).eq("id", bid);
    }

    // Increment invoice number
    if (fs?.id) {
      await supabase.from("financial_settings" as any).update({ next_invoice_number: nextNum + 1 }).eq("id", fs.id);
    }

    toast.success(`Facture ${invoiceNumber} créée`);
    await fetchInvoices();
    return invoice;
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("invoices" as any)
      .update({ status })
      .eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Statut mis à jour");
    await fetchInvoices();
  };

  const deleteInvoice = async (id: string) => {
    // First delete items
    await supabase.from("invoice_items" as any).delete().eq("invoice_id", id);
    const { error } = await supabase
      .from("invoices" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }
    toast.success("Facture supprimée");
    await fetchInvoices();
  };

  return { invoices, loading, createInvoice, updateInvoiceStatus, deleteInvoice, fetchInvoiceWithItems, refetch: fetchInvoices };
}

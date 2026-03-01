import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  user_id: string;
  owner_id: string;
  invoice_number: string;
  invoice_date: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  status: string;
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

  const generateInvoice = async (params: {
    owner_id: string;
    period_start: string;
    period_end: string;
    bookings: any[];
    financial_settings: any;
    owner: any;
    vat_rate: number;
    custom_items?: any[];
    custom_subtotal?: number;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fs = params.financial_settings;
    const prefix = fs?.invoice_prefix || "FAC";
    const nextNum = fs?.next_invoice_number || 1;
    const invoiceNumber = `${prefix}-${String(nextNum).padStart(5, "0")}`;

    // Use custom items/subtotal if provided, otherwise fall back to old logic
    let subtotal: number;
    let items: any[];

    if (params.custom_items && params.custom_subtotal !== undefined) {
      subtotal = params.custom_subtotal;
      items = params.custom_items;
    } else {
      subtotal = 0;
      items = [];
      for (const b of params.bookings) {
        const ownerNet = Number(b.owner_net) || 0;
        subtotal += ownerNet;
        items.push({
          booking_id: b.id,
          description: `Réservation ${b.check_in} → ${b.check_out}${b.guest_name ? ` (${b.guest_name})` : ""}`,
          quantity: 1,
          unit_price: ownerNet,
          total: ownerNet,
          item_type: "revenue",
        });
      }
    }

    const vatAmount = subtotal * (params.vat_rate / 100);
    const total = subtotal + vatAmount;

    const { data: invoice, error } = await supabase
      .from("invoices" as any)
      .insert({
        user_id: user.id,
        owner_id: params.owner_id,
        invoice_number: invoiceNumber,
        period_start: params.period_start,
        period_end: params.period_end,
        subtotal,
        vat_rate: params.vat_rate,
        vat_amount: vatAmount,
        total,
        status: "pending",
        company_snapshot: fs ? { company_name: fs.company_name, address: fs.address, vat_number: fs.vat_number, iban: fs.iban, legal_footer: fs.legal_footer } : null,
        owner_snapshot: { first_name: params.owner.first_name, last_name: params.owner.last_name, email: params.owner.email, phone: params.owner.phone },
      })
      .select()
      .single();

    if (error) { toast.error("Erreur génération facture"); return null; }

    const invoiceId = (invoice as any).id;
    for (const item of items) {
      await supabase.from("invoice_items" as any).insert({ ...item, invoice_id: invoiceId });
    }

    // Update booking statuses
    for (const b of params.bookings) {
      await supabase.from("bookings" as any).update({ financial_status: "invoiced" }).eq("id", b.id);
    }

    // Increment invoice number
    if (fs?.id) {
      await supabase.from("financial_settings" as any).update({ next_invoice_number: nextNum + 1 }).eq("id", fs.id);
    }

    toast.success(`Facture ${invoiceNumber} générée`);
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
    const { error } = await supabase
      .from("invoices" as any)
      .delete()
      .eq("id", id);
    if (error) { toast.error("Erreur suppression"); return; }
    toast.success("Facture supprimée");
    await fetchInvoices();
  };

  return { invoices, loading, generateInvoice, updateInvoiceStatus, deleteInvoice, fetchInvoiceWithItems, refetch: fetchInvoices };
}

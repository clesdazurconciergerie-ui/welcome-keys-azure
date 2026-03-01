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

/** Generate invoice number as YYYY-NNN based on year + next_invoice_number */
function generateInvoiceNumber(nextNum: number): string {
  const year = new Date().getFullYear();
  return `${year}-${String(nextNum).padStart(3, "0")}`;
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
    vatEnabled?: boolean;
    items: Omit<InvoiceItem, "id" | "invoice_id">[];
    financial_settings: any;
    owner: any;
    notes?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fs = params.financial_settings;
    const nextNum = fs?.next_invoice_number || 1;
    const invoiceNumber = generateInvoiceNumber(nextNum);
    const vatEnabled = params.vatEnabled ?? true;

    // Sanitize items: force vat to 0 when disabled
    const sanitizedItems = params.items.map(item => ({
      ...item,
      vat_rate: vatEnabled ? (item.vat_rate || 0) : 0,
    }));

    const subtotal = sanitizedItems.reduce((s, item) => s + (item.quantity * item.unit_price), 0);
    const vatAmount = vatEnabled
      ? sanitizedItems.reduce((s, item) => {
          const lineTotal = item.quantity * item.unit_price;
          return s + lineTotal * ((item.vat_rate || 0) / 100);
        }, 0)
      : 0;
    const total = subtotal + vatAmount;

    // Build company_snapshot with all new fields
    const companySnapshot = fs ? {
      company_name: fs.company_name,
      address: fs.address,
      org_phone: fs.org_phone,
      org_postal_code: fs.org_postal_code,
      org_city: fs.org_city,
      vat_number: fs.vat_number,
      iban: fs.iban,
      bic: fs.bic,
      legal_footer: fs.legal_footer,
      default_due_days: fs.default_due_days,
      vat_enabled: fs.vat_enabled,
    } : null;

    // Build owner_snapshot with billing fields
    const ownerSnapshot = {
      first_name: params.owner.first_name,
      last_name: params.owner.last_name,
      email: params.owner.email,
      phone: params.owner.phone,
      billing_street: params.owner.billing_street,
      billing_postal_code: params.owner.billing_postal_code,
      billing_city: params.owner.billing_city,
    };

    // Step 1: Insert invoice
    console.log("[Invoice] Step 1: Inserting invoice...");
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
        vat_rate: vatEnabled ? params.vat_rate : 0,
        vat_amount: vatAmount,
        total,
        type: params.type || "invoice",
        status: params.status || "draft",
        notes: params.notes || null,
        company_snapshot: companySnapshot,
        owner_snapshot: ownerSnapshot,
      })
      .select()
      .single();

    if (error) {
      console.error("[Invoice] Step 1 FAILED - Insert invoice:", { message: error.message, details: error.details, hint: error.hint, code: error.code });
      toast.error(`Erreur création facture: ${error.message}${error.details ? ` (${error.details})` : ""}${error.hint ? ` — ${error.hint}` : ""}`);
      return null;
    }
    console.log("[Invoice] Step 1 OK - Invoice created:", (invoice as any).id);

    // Step 2: Insert line items
    const invoiceId = (invoice as any).id;
    for (let i = 0; i < sanitizedItems.length; i++) {
      const item = sanitizedItems[i];
      console.log(`[Invoice] Step 2: Inserting item ${i + 1}/${sanitizedItems.length}...`);
      const { error: itemError } = await supabase.from("invoice_items" as any).insert({
        invoice_id: invoiceId,
        booking_id: item.booking_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        item_type: item.item_type || "revenue",
        line_type: item.line_type || "rental_manual",
        vat_rate: vatEnabled ? (item.vat_rate || 0) : 0,
        property_id: item.property_id || null,
        metadata: item.metadata || {},
      });
      if (itemError) {
        console.error(`[Invoice] Step 2 FAILED - Insert item ${i + 1}:`, { message: itemError.message, details: itemError.details, hint: itemError.hint, code: itemError.code });
        toast.error(`Erreur ligne ${i + 1}: ${itemError.message}`);
      }
    }
    console.log("[Invoice] Step 2 OK - All items inserted");

    // Step 3: Mark bookings as invoiced
    const bookingIds = params.items
      .filter(i => i.booking_id)
      .map(i => i.booking_id);
    for (const bid of bookingIds) {
      const { error: bkErr } = await supabase.from("bookings" as any).update({ financial_status: "invoiced" }).eq("id", bid);
      if (bkErr) console.error("[Invoice] Step 3 - Booking update error:", bkErr);
    }

    // Step 4: Increment invoice number
    if (fs?.id) {
      const { error: fsErr } = await supabase.from("financial_settings" as any).update({ next_invoice_number: nextNum + 1 }).eq("id", fs.id);
      if (fsErr) console.error("[Invoice] Step 4 - Financial settings update error:", fsErr);
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

  return { invoices, loading, createInvoice, updateInvoiceStatus, updateInvoicePdf, deleteInvoice, fetchInvoiceWithItems, refetch: fetchInvoices };
}

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Preflight validation for invoice generation
 */
export function validateInvoiceForGeneration(
  invoice: any,
  items: any[],
  financialSettings: any
): string[] {
  const errors: string[] = [];

  if (!financialSettings) {
    errors.push("Paramètres financiers manquants. Configurez-les dans Finance > Paramètres.");
  } else {
    if (!financialSettings.company_name) errors.push("Nom de la société manquant dans les paramètres financiers.");
    if (!financialSettings.iban) errors.push("IBAN manquant dans les paramètres financiers.");
    if (!financialSettings.bic) errors.push("BIC manquant dans les paramètres financiers.");
  }

  const owner = invoice?.owner_snapshot || invoice?.owner;
  if (!owner) {
    errors.push("Informations du propriétaire manquantes.");
  } else {
    if (!owner.first_name && !owner.last_name) errors.push("Nom du propriétaire manquant.");
  }

  if (!items || items.length === 0) {
    errors.push("La facture ne contient aucune ligne.");
  }

  if (invoice) {
    const total = Number(invoice.total);
    const subtotal = Number(invoice.subtotal);
    if (isNaN(total) || isNaN(subtotal)) {
      errors.push("Les totaux de la facture sont invalides (NaN).");
    }
  }

  return errors;
}

/**
 * Download the invoice as PDF using html2pdf.js
 */
export async function downloadInvoiceAsPdf(invoiceNumber: string): Promise<void> {
  const printEl = document.getElementById("invoice-print");
  if (!printEl) {
    toast.error("Prévisualisation introuvable. Ouvrez d'abord la facture.");
    return;
  }

  const toastId = toast.loading("Génération du PDF en cours…");

  try {
    const html2pdf = (await import("html2pdf.js")).default;

    await html2pdf()
      .set({
        margin: 0,
        filename: `Facture-${invoiceNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printEl)
      .save();

    toast.success("PDF téléchargé", { id: toastId });
  } catch (e: any) {
    console.error("[InvoicePDF] PDF generation error:", e);
    toast.error(`Erreur PDF: ${e?.message || "Erreur inconnue"}`, { id: toastId });
  }
}

/**
 * Generate PDF blob and upload to Supabase Storage.
 */
export async function generateAndUploadInvoicePdf(
  invoiceId: string,
  invoiceNumber: string,
): Promise<string | null> {
  const printEl = document.getElementById("invoice-print");
  if (!printEl) {
    toast.error("Impossible de trouver le contenu de la facture.");
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error("Non authentifié");
    return null;
  }

  try {
    const html2pdf = (await import("html2pdf.js")).default;

    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: 0,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(printEl)
      .outputPdf("blob");

    const filePath = `${user.id}/${invoiceId}.pdf`;

    const { error } = await supabase.storage
      .from("invoices")
      .upload(filePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) {
      console.error("[InvoicePDF] Upload error:", error);
      toast.error(`Erreur upload: ${error.message}`);
      return null;
    }

    return filePath;
  } catch (e: any) {
    console.error("[InvoicePDF] Generation error:", e);
    toast.error(`Erreur génération PDF: ${e?.message || "Erreur inconnue"}`);
    return null;
  }
}

/**
 * Download the invoice via window.print()
 */
export function printInvoice() {
  window.print();
}

/**
 * Get a download URL for a stored invoice PDF
 */
export async function getInvoiceDownloadUrl(pdfPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("invoices")
    .createSignedUrl(pdfPath, 3600);

  if (error) {
    console.error("[InvoicePDF] Download URL error:", error);
    toast.error(`Erreur téléchargement: ${error.message}`);
    return null;
  }
  return data.signedUrl;
}

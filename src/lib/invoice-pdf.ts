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

  // Check financial settings
  if (!financialSettings) {
    errors.push("Paramètres financiers manquants. Configurez-les dans Finance > Paramètres.");
  } else {
    if (!financialSettings.company_name) errors.push("Nom de la société manquant dans les paramètres financiers.");
    if (!financialSettings.iban) errors.push("IBAN manquant dans les paramètres financiers.");
    if (!financialSettings.bic) errors.push("BIC manquant dans les paramètres financiers.");
  }

  // Check owner info
  const owner = invoice?.owner_snapshot || invoice?.owner;
  if (!owner) {
    errors.push("Informations du propriétaire manquantes.");
  } else {
    if (!owner.first_name && !owner.last_name) errors.push("Nom du propriétaire manquant.");
  }

  // Check line items
  if (!items || items.length === 0) {
    errors.push("La facture ne contient aucune ligne.");
  }

  // Check totals
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
 * Generate and upload invoice HTML to Supabase Storage.
 */
export async function generateAndUploadInvoicePdf(
  invoiceId: string,
  invoiceNumber: string,
): Promise<string | null> {
  const printEl = document.getElementById("invoice-print");
  if (!printEl) {
    toast.error("Impossible de trouver le contenu de la facture. Assurez-vous que la prévisualisation est visible.");
    console.error("[InvoicePDF] #invoice-print element not found");
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error("Non authentifié");
    return null;
  }

  // Create an HTML blob for the invoice
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Facture ${invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; }
      </style>
    </head>
    <body>${printEl.outerHTML}</body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const filePath = `${user.id}/${invoiceId}.html`;

  const { error } = await supabase.storage
    .from("invoices")
    .upload(filePath, blob, {
      contentType: "text/html",
      upsert: true,
    });

  if (error) {
    console.error("[InvoicePDF] Upload error:", error);
    toast.error(`Erreur upload: ${error.message}. Vous pouvez toujours imprimer via le bouton "Imprimer".`);
    return null;
  }

  return filePath;
}

/**
 * Download the invoice as a printable document via window.print()
 */
export function printInvoice() {
  window.print();
}

/**
 * Get a download URL for a stored invoice
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

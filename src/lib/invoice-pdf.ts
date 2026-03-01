import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Generate a PDF from the invoice print view using the browser's print API,
 * then upload to Supabase Storage.
 */
export async function generateAndUploadInvoicePdf(
  invoiceId: string,
  invoiceNumber: string,
): Promise<string | null> {
  const printEl = document.getElementById("invoice-print");
  if (!printEl) {
    toast.error("Impossible de trouver le contenu de la facture");
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
    toast.error("Erreur lors de l'upload du fichier");
    console.error(error);
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
    .createSignedUrl(pdfPath, 3600); // 1 hour expiry

  if (error) {
    toast.error("Erreur téléchargement");
    return null;
  }
  return data.signedUrl;
}

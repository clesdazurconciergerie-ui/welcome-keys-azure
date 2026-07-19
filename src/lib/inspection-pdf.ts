// MODULE — Génère PDF client-side, upload dans storage, met à jour report_pdf_url
import html2pdf from "html2pdf.js";
import { supabase } from "@/integrations/supabase/client";

export async function generateAndUploadInspectionPdf(params: {
  elementId: string;
  inspectionId: string;
  userId: string;
  propertyName: string;
  officialDate: string;
}): Promise<string> {
  const node = document.getElementById(params.elementId);
  if (!node) throw new Error("Contenu PDF introuvable");

  const worker = html2pdf().set({
    margin: 10,
    image: { type: "jpeg", quality: 0.92 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(node);

  const pdfBlob: Blob = await worker.outputPdf("blob");
  const path = `reports/${params.userId}/${params.inspectionId}.pdf`;

  const { error: upErr } = await supabase.storage
    .from("inspection-photos")
    .upload(path, pdfBlob, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  const { data: signed } = await supabase.storage
    .from("inspection-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 60);
  const url = signed?.signedUrl ?? "";

  await (supabase as any).from("property_inspections").update({
    report_pdf_url: url,
  }).eq("id", params.inspectionId);

  return url;
}

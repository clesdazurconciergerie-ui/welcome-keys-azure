import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InvoicePrintView } from "@/components/finance/InvoicePrintView";
import { downloadInvoiceAsPdf } from "@/lib/invoice-pdf";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type DeliveryPreview={invoice_id:string;invoice_number:string;owner_name:string;total:string;fingerprint:string;published_at:string|null};
export function InvoiceOwnerDeliveryPanel({invoiceId}:{invoiceId:string}) {
  const [preview,setPreview]=useState<DeliveryPreview|null>(null);
  const [invoice,setInvoice]=useState<any>(null);
  const [items,setItems]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);setPreview(null);setInvoice(null);setItems([]);setMessage("");
    try {
      const [head,lines,delivery]=await Promise.all([
        supabase.from("invoices" as any).select("*").eq("id",invoiceId).single(),
        supabase.from("invoice_items" as any).select("*").eq("invoice_id",invoiceId),
        (supabase as any).rpc("invoice_owner_delivery_preview",{p_invoice_id:invoiceId}),
      ]);
      if(head.error || lines.error || delivery.error || !delivery.data)throw new Error();
      setInvoice(head.data);setItems(lines.data||[]);setPreview(delivery.data);
    } catch {setMessage("Dépôt bloqué : vérifie les totaux et le rattachement du compte propriétaire.");}
    finally {setLoading(false);}
  },[invoiceId]);
  useEffect(()=>{void load();},[load]);
  const publish=async()=>{
    if(!preview || working)return;
    setWorking(true);
    try {
      const {data,error}=await (supabase as any).rpc("publish_invoice_to_owner",{p_invoice_id:invoiceId,p_fingerprint:preview.fingerprint});
      if(error || data?.state!=="published")throw new Error();
      setPreview(data);toast.success("Facture disponible dans l’espace propriétaire.");
    }catch {setMessage("Dépôt non confirmé. Recharge la facture avant de réessayer : son contenu a peut-être changé.");}
    finally{setWorking(false);}
  };
  return <section className="space-y-4 border-t pt-6" aria-labelledby="owner-delivery-title">
    <h2 id="owner-delivery-title" className="text-xl font-medium">Déposer dans l’espace propriétaire</h2>
    {loading && <p role="status">Vérification de la facture…</p>}
    {message && <p role="alert">{message}</p>}
    <Button variant="outline" onClick={load} disabled={working||loading}>Actualiser la vérification</Button>
    {preview && invoice && <>
      <p>Destinataire : <strong>{preview.owner_name}</strong> · Facture {preview.invoice_number} · {Number(preview.total).toLocaleString("fr-FR",{style:"currency",currency:"EUR"})}</p>
      <Button variant="outline" onClick={()=>downloadInvoiceAsPdf(invoice.id,invoice.invoice_number)}>Télécharger le PDF My Welcome</Button>
      <div className="overflow-x-auto rounded-xl border"><InvoicePrintView invoice={invoice} items={items}/></div>
      {preview.published_at ? <p role="status">Disponible dans l’espace propriétaire. Aucun e-mail envoyé.</p> : <Button onClick={publish} disabled={working}>Valider le dépôt dans l’espace propriétaire</Button>}
      <p className="text-sm text-muted-foreground">Le propriétaire pourra consulter la facture et télécharger son PDF avec le même modèle My Welcome. Ce dépôt n’envoie aucun e-mail et ne marque pas la facture payée.</p>
    </>}
  </section>;
}

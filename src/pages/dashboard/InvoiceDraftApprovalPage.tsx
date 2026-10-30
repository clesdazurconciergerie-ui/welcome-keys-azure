import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { InvoiceOwnerDeliveryPanel } from "@/components/finance/InvoiceOwnerDeliveryPanel";

type DraftView = {
  draft_id: string;
  version: number;
  recipient_name?: string;
  status: "draft" | "approved" | "created" | "expired";
  fingerprint: string;
  expires_at: string;
  input: {
    issue_date: string;
    due_date?: string | null;
    period_start: string;
    period_end: string;
    type: string;
    lines: Array<{ line_id: string; description: string }>;
  };
  calculation: {
    currency: "EUR";
    subtotal_cents: number;
    vat_cents: number;
    total_cents: number;
    rounding_policy: string;
    lines: Array<{ line_id: string; quantity: string; net_cents: number; vat_cents: number; gross_cents: number }>;
  };
  created_invoice_id?: string | null;
};

function money(cents: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("jarvis-invoice-creation", { body });
  if (error || data?.error) throw new Error(data?.error || "invoice_operation_failed");
  return data;
}

export default function InvoiceDraftApprovalPage() {
  const { draftId } = useParams();
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [created, setCreated] = useState<any>(null);

  const load = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    try {
      const data = await invoke({ action: "get", draft_id: draftId });
      if (!data?.draft) throw new Error("invoice_draft_not_found");
      setDraft(data.draft);
    } catch {
      toast.error("Ce brouillon est introuvable ou n’appartient pas à votre compte.");
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => { load(); }, [load]);

  const lines = useMemo(() => {
    if (!draft) return [];
    return draft.calculation.lines.map((calculated) => ({
      ...calculated,
      description: draft.input.lines.find((line) => line.line_id === calculated.line_id)?.description || "Ligne de facture",
    }));
  }, [draft]);

  const approve = async () => {
    if (!draft) return;
    setWorking(true);
    try {
      await invoke({
        action: "approve",
        draft_id: draft.draft_id,
        version: draft.version,
        fingerprint: draft.fingerprint,
      });
      toast.success(`Version ${draft.version} approuvée.`);
      await load();
    } catch {
      toast.error("Approbation refusée. Rechargez le brouillon avant de réessayer.");
    } finally {
      setWorking(false);
    }
  };

  const create = async () => {
    if (!draft) return;
    const storageKey = `invoice-create:${draft.draft_id}:${draft.version}`;
    const idempotencyKey = localStorage.getItem(storageKey) || `mywelcome:invoice:${crypto.randomUUID()}`;
    localStorage.setItem(storageKey, idempotencyKey);
    setWorking(true);
    try {
      let data;
      try {
        data = await invoke({
          action: "create",
          draft_id: draft.draft_id,
          version: draft.version,
          fingerprint: draft.fingerprint,
          idempotency_key: idempotencyKey,
        });
      } catch {
        // A lost HTTP response is recovered with the same durable key.
        data = await invoke({ action: "result", idempotency_key: idempotencyKey });
      }
      if (data?.state !== "created" || !data?.result?.invoice_id) throw new Error("invoice_not_created");
      setCreated(data.result);
      toast.success(`Facture ${data.result.invoice_number} créée intégralement.`);
      await load();
    } catch {
      toast.error("Création interrompue. Aucun succès n’est affiché sans résultat serveur complet.");
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!draft) return <div className="space-y-4"><p>Brouillon inaccessible.</p><Button asChild variant="outline"><Link to="/dashboard/finance">Retour à Finance</Link></Button></div>;

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in">
      <Link to="/dashboard/finance" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Retour à Finance
      </Link>

      <div className="flex flex-col gap-4 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Contrôle avant création</p>
          <h1 className="text-4xl font-light tracking-tight">Approuver le brouillon</h1>
          <p className="mt-2 text-sm text-muted-foreground">Version {draft.version} · toute modification invalide cet accord.</p>
        </div>
        <Badge variant="outline" className="w-fit uppercase">{draft.status}</Badge>
      </div>

      <Card>
        <CardContent className="space-y-6 p-6">
          <p className="font-medium">Propriétaire destinataire : {draft.recipient_name || "À vérifier"}</p>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Émission</p><p className="font-medium">{draft.input.issue_date}</p></div>
            <div><p className="text-xs text-muted-foreground">Période</p><p className="font-medium">{draft.input.period_start} → {draft.input.period_end}</p></div>
            <div><p className="text-xs text-muted-foreground">Expiration</p><p className="font-medium">{new Date(draft.expires_at).toLocaleString("fr-FR")}</p></div>
          </div>

          <div className="divide-y border-y">
            {lines.map((line) => (
              <div key={line.line_id} className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <div><p className="font-medium">{line.description}</p><p className="text-xs text-muted-foreground">Quantité {line.quantity} · TVA {money(line.vat_cents)}</p></div>
                <p className="font-semibold">{money(line.gross_cents)}</p>
              </div>
            ))}
          </div>

          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-8"><span className="text-muted-foreground">Sous-total</span><span>{money(draft.calculation.subtotal_cents)}</span></div>
            <div className="flex justify-between gap-8"><span className="text-muted-foreground">TVA</span><span>{money(draft.calculation.vat_cents)}</span></div>
            <div className="flex justify-between gap-8 border-t pt-2 text-base font-semibold"><span>Total</span><span>{money(draft.calculation.total_cents)}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-foreground" /><p>Le calcul affiché vient du serveur. L’approbation porte uniquement sur cette version et cette empreinte. La création et le dépôt dans l’espace propriétaire restent séparés. Le PDF reprend le modèle My Welcome. Aucun e-mail n’est envoyé.</p></div>
      </div>

      {created || draft.status === "created" ? (
        <div className="flex items-center gap-3 border-t pt-6"><CheckCircle2 className="h-5 w-5" /><p className="font-medium">Facture créée intégralement{created?.invoice_number ? ` : ${created.invoice_number}` : ""}.</p></div>
      ) : (
        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
          {draft.status === "draft" && <Button onClick={approve} disabled={working}>{working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approuver cette version</Button>}
          {draft.status === "approved" && <Button onClick={create} disabled={working}>{working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer la facture</Button>}
        </div>
      )}
      {(created?.invoice_id || draft.created_invoice_id) && <InvoiceOwnerDeliveryPanel invoiceId={created?.invoice_id || draft.created_invoice_id!} />}
    </div>
  );
}

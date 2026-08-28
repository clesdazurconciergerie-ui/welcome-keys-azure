// MODULE — Page détail / rapport d'un état des lieux (v2 : zones, anomalies, photos, signatures)
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Download, FileText, Loader2, Lock, AlertTriangle, CheckCircle2,
  ShieldAlert, Trash2, PenLine, DoorOpen, DoorClosed,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInspectionFlow } from "@/hooks/useInspectionFlow";
import { usePropertyInspections } from "@/hooks/usePropertyInspections";
import {
  INSPECTION_ZONES, ZONE_LABEL, ISSUE_CATEGORY_LABEL, ISSUE_SEVERITY_LABEL,
  INSPECTION_STATUS_LABEL, INSPECTION_TYPE_LABEL,
} from "@/lib/inspection-zones";
import { InspectionPrintView } from "@/components/inspection/InspectionPrintView";
import { generateAndUploadInspectionPdf } from "@/lib/inspection-pdf";
import { StorageImage } from "@/components/StorageImage";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

export default function InspectionV2DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const flow = useInspectionFlow(id);
  const { remove } = usePropertyInspections();
  const [generating, setGenerating] = useState(false);

  const audit = useQuery({
    queryKey: ["inspection-audit", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("inspection_audit_log")
        .select("id, action, created_at, changed_by_name")
        .eq("inspection_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const insp = flow.inspection.data;
  const zonesRaw = flow.zones.data ?? [];
  const issues = flow.issues.data ?? [];
  const photos = flow.photos.data ?? [];

  // Dédoublonne et ordonne les zones selon le parcours officiel
  const zones = INSPECTION_ZONES
    .map((z) => zonesRaw.find((x) => x.zone_key === z.key))
    .filter(Boolean) as typeof zonesRaw;

  if (flow.inspection.isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  }
  if (!insp) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-muted-foreground">État des lieux introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/etats-des-lieux")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la liste
        </Button>
      </div>
    );
  }

  const locked = !!insp.locked_at || insp.status === "validated";
  const anomalies = issues.length;

  const generatePdf = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      await new Promise((r) => setTimeout(r, 300));
      const url = await generateAndUploadInspectionPdf({
        elementId: "inspection-print-view",
        inspectionId: id,
        userId: user.id,
        propertyName: insp.property?.name ?? "bien",
        officialDate: insp.official_date,
      });
      await flow.inspection.refetch();
      qc.invalidateQueries({ queryKey: ["property-inspections"] });
      toast.success("PDF généré");
      if (url) window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e.message ?? "Génération PDF impossible");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Supprimer définitivement cet état des lieux ?")) return;
    await remove.mutateAsync(id);
    navigate("/dashboard/etats-des-lieux");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 max-w-4xl mx-auto">
      <SEOHead
        title={`État des lieux — ${insp.property?.name ?? "Bien"}`}
        description="Rapport d'état des lieux : zones contrôlées, anomalies, photos et signatures."
      />

      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/etats-des-lieux")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Button>

      <header className="space-y-3">
        <div className="flex items-start gap-2">
          {insp.inspection_type === "exit"
            ? <DoorClosed className="h-6 w-6 mt-1 shrink-0" strokeWidth={1.5} />
            : <DoorOpen className="h-6 w-6 mt-1 shrink-0" strokeWidth={1.5} />}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">
              {insp.property?.name ?? "Bien"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {INSPECTION_TYPE_LABEL[insp.inspection_type] ?? insp.inspection_type}
              {" · "}{new Date(insp.official_date).toLocaleDateString("fr-FR")}
              {insp.reference ? ` · ${insp.reference}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            {locked ? <Lock className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
            {INSPECTION_STATUS_LABEL[insp.status] ?? insp.status}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> {anomalies} anomalie{anomalies > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline">{photos.length} média{photos.length > 1 ? "s" : ""}</Badge>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {!locked && (
            <Button onClick={() => navigate(`/dashboard/etats-des-lieux/${insp.id}/remplir`)}>
              Reprendre le contrôle
            </Button>
          )}
          {insp.report_pdf_url ? (
            <Button asChild variant="outline">
              <a href={insp.report_pdf_url} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4 mr-2" /> Télécharger le PDF
              </a>
            </Button>
          ) : null}
          <Button variant="outline" onClick={generatePdf} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            {insp.report_pdf_url ? "Régénérer le PDF" : "Générer le PDF"}
          </Button>
          {!locked && (
            <Button variant="ghost" onClick={handleDelete} disabled={remove.isPending}>
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
            </Button>
          )}
        </div>
      </header>

      {/* Informations */}
      <section className="space-y-2">
        <SectionTitle>Informations</SectionTitle>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <Row label="Voyageur" value={insp.guest_name ?? insp.booking?.guest_name ?? "—"} />
          <Row
            label="Séjour"
            value={insp.booking
              ? `${new Date(insp.booking.check_in).toLocaleDateString("fr-FR")} → ${new Date(insp.booking.check_out).toLocaleDateString("fr-FR")}`
              : "—"}
          />
          <Row label="Réalisé par" value={insp.inspector_name ?? insp.concierge_signer_name ?? "—"} />
          <Row
            label="Signé le"
            value={insp.signed_at ? new Date(insp.signed_at).toLocaleString("fr-FR") : "Non signé"}
          />
        </dl>
      </section>

      {/* Zones */}
      <section className="space-y-2">
        <SectionTitle>Zones contrôlées</SectionTitle>
        {zones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune zone enregistrée.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {zones.map((z) => (
              <li key={z.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{ZONE_LABEL[z.zone_key] ?? z.zone_label}</p>
                  {z.note && <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{z.note}</p>}
                </div>
                <span className="text-xs flex items-center gap-1.5 shrink-0">
                  {z.status === "ok" && <><CheckCircle2 className="h-3.5 w-3.5" /> Conforme</>}
                  {z.status === "issue" && <><AlertTriangle className="h-3.5 w-3.5" /> Problème</>}
                  {z.status === "pending" && <><ShieldAlert className="h-3.5 w-3.5" /> Non contrôlée</>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Anomalies */}
      <section className="space-y-2">
        <SectionTitle>Anomalies ({anomalies})</SectionTitle>
        {anomalies === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune anomalie signalée.</p>
        ) : (
          <div className="space-y-2">
            {issues.map((i) => (
              <div key={i.id} className="border border-border p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{ZONE_LABEL[i.zone_key] ?? i.zone_key}</Badge>
                  <Badge variant="outline">{ISSUE_CATEGORY_LABEL[i.category] ?? i.category}</Badge>
                  <Badge variant={i.severity === "urgent" ? "default" : "outline"}>
                    {ISSUE_SEVERITY_LABEL[i.severity] ?? i.severity}
                  </Badge>
                </div>
                {i.comment && <p className="text-sm whitespace-pre-wrap">{i.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Médias */}
      <section className="space-y-2">
        <SectionTitle>Photos & vidéos ({photos.length})</SectionTitle>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun média joint.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((p) => (
              <figure key={p.id} className="border border-border">
                {p.media_type === "video" ? (
                  <video src={p.file_url} controls className="w-full h-28 object-cover bg-muted" />
                ) : (
                  <StorageImage src={p.file_url} alt={p.caption ?? "Média état des lieux"} className="w-full h-28 object-cover bg-muted" loading="lazy" />
                )}
                <figcaption className="text-[10px] px-1.5 py-1 text-muted-foreground truncate">
                  {ZONE_LABEL[p.zone_key ?? ""] ?? p.zone_key ?? "—"}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      {(insp.general_notes || insp.notes) && (
        <section className="space-y-2">
          <SectionTitle>Notes générales</SectionTitle>
          <p className="text-sm whitespace-pre-wrap">{insp.general_notes || insp.notes}</p>
        </section>
      )}

      {/* Signatures */}
      <section className="space-y-2">
        <SectionTitle>Signatures</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SignatureBlock title="Conciergerie" url={insp.concierge_signature_url} name={insp.concierge_signer_name ?? insp.inspector_name} />
          <SignatureBlock title="Voyageur" url={insp.guest_signature_url} name={insp.guest_signer_name ?? insp.guest_name} />
        </div>
      </section>

      {/* Historique */}
      <section className="space-y-2">
        <SectionTitle>Historique</SectionTitle>
        {(audit.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
        ) : (
          <ol className="space-y-2">
            {(audit.data ?? []).map((e: any) => (
              <li key={e.id} className="border-l-2 border-border pl-3">
                <p className="text-sm capitalize">{String(e.action).replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("fr-FR")}
                  {e.changed_by_name ? ` · ${e.changed_by_name}` : ""}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Rendu PDF hors écran */}
      <div className="fixed -left-[10000px] top-0" aria-hidden="true">
        <InspectionPrintView
          inspection={insp}
          zones={zones}
          issues={issues}
          photos={photos}
          conciergeSignature={insp.concierge_signature_url}
          guestSignature={insp.guest_signature_url}
        />
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2">
      {children}
    </h2>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </>
  );
}

function SignatureBlock({ title, url, name }: { title: string; url?: string | null; name?: string | null }) {
  return (
    <div className="border border-border p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      {url ? (
        <img src={url} alt={`Signature ${title}`} className="h-20 w-full object-contain bg-white" />
      ) : (
        <div className="h-20 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border">
          Non signé
        </div>
      )}
      <p className="text-sm border-t border-border pt-2">{name ?? "—"}</p>
    </div>
  );
}

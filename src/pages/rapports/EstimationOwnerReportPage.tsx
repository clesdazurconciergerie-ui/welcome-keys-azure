// MODULE — Estimation locative · étape 5 : aperçu et export du rapport propriétaire.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { resolveStorageUrl } from "@/components/StorageImage";
import { useEstimation } from "@/hooks/useEstimationsLoc";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import OwnerReportDocument from "@/components/estimation/report/OwnerReportDocument";
import {
  buildReportData, validateReportData, hasBlockingIssue, type ReportCheck,
} from "@/lib/estimation-locative/report-data";

/** Les images doivent être intégrées au document pour l'export PDF (pas de requête réseau). */
async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export default function EstimationOwnerReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const flow = useEstimation(id);
  const { settings } = useFinancialSettings();
  const est = flow.estimation.data as any;
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  const data = useMemo(() => {
    if (!est) return null;
    return buildReportData({
      estimation: est,
      photos: (flow.photos.data ?? []) as any,
      comparables: (flow.comparables.data ?? []) as any,
      agency: settings ? {
        name: settings.company_name,
        address: settings.address,
        city: [settings.org_postal_code, settings.org_city].filter(Boolean).join(" ") || null,
        phone: settings.org_phone,
        email: null,
      } : null,
    });
  }, [est, flow.photos.data, flow.comparables.data, settings]);

  const checks: ReportCheck[] = useMemo(
    () => (data ? validateReportData(data, est?.engine_output ?? null) : []),
    [data, est],
  );
  const blocked = hasBlockingIssue(checks);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const wanted = [data.cover.photo, ...data.property.photos].filter(Boolean) as { id: string; storage_path: string }[];
    (async () => {
      const out: Record<string, string> = {};
      for (const p of wanted) {
        try {
          const signed = await resolveStorageUrl(
            `/storage/v1/object/public/estimation-photos/${encodeURIComponent(p.storage_path)}`,
          );
          out[p.id] = await toDataUrl(signed);
        } catch { /* une photo indisponible n'empêche pas le rapport */ }
      }
      if (!cancelled) setPhotoUrls(out);
    })();
    return () => { cancelled = true; };
  }, [data]);

  const exportPdf = async () => {
    const el = document.getElementById("estimation-report");
    if (!el || !data) return;
    setExporting(true);
    const toastId = toast.loading("Génération du PDF…");
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set({
        margin: 0,
        filename: `Estimation-locative-${data.meta.reference}.pdf`,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: 794 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      }).from(el).save();
      toast.success("Rapport téléchargé", { id: toastId });
    } catch (e: any) {
      toast.error(e?.message ?? "Export impossible", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  if (flow.estimation.isLoading) {
    return <div className="max-w-4xl mx-auto space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-[600px]" /></div>;
  }
  if (!est || !data) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <p className="text-muted-foreground">Estimation introuvable.</p>
        <Button variant="outline" onClick={() => navigate("/rapports/estimations")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const noEngine = !est.engine_output;

  return (
    <div className="max-w-[900px] mx-auto space-y-8 pb-24">
      <SEOHead title={`${data.meta.reference} — Rapport d'estimation locative`} description="Rapport propriétaire d'estimation de potentiel locatif." />

      <header className="space-y-4 border-b pb-6">
        <button onClick={() => navigate(`/rapports/estimations/${id}`)} className="text-xs uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground flex items-center gap-2">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> Retour à l'estimation
        </button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-wider text-muted-foreground">{data.meta.reference}</p>
            <h1 className="text-2xl font-light tracking-tight mt-1">Rapport propriétaire</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => flow.compute.mutate()} disabled={flow.compute.isPending}>
              {flow.compute.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Recalculer
            </Button>
            <Button onClick={exportPdf} disabled={exporting || blocked || noEngine}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Exporter en PDF
            </Button>
          </div>
        </div>
      </header>

      {noEngine && (
        <p className="text-sm border-l-2 pl-3 text-muted-foreground">
          Le calcul n'a pas encore été lancé pour cette estimation : lancez-le pour obtenir les tarifs et la projection.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Contrôles avant génération</h2>
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              {c.level === "ok"
                ? <Check className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />}
              <span className={c.level === "ok" ? "" : "font-medium"}>
                {c.label}
                {c.detail && <span className="block text-xs text-muted-foreground font-normal">{c.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-x-auto">
        <div className="origin-top-left" style={{ transform: "scale(0.92)", width: "217mm" }}>
          <OwnerReportDocument data={data} photoUrls={photoUrls} preview />
        </div>
      </section>
    </div>
  );
}

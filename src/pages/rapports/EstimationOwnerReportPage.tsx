// MODULE — Estimation locative · aperçu et export du rapport propriétaire (étape 6).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Download, Loader2, RefreshCw, Check, AlertTriangle, Pencil,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { resolveStorageUrl } from "@/components/StorageImage";
import { useEstimation } from "@/hooks/useEstimationsLoc";
import { useFinancialSettings } from "@/hooks/useFinancialSettings";
import OwnerReportDocument, { type ReportFitReport } from "@/components/estimation/report/OwnerReportDocument";
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

const ZOOM_STEPS = [0.5, 0.6, 0.7, 0.8, 0.92, 1, 1.15, 1.3];

export default function EstimationOwnerReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const flow = useEstimation(id);
  const { settings } = useFinancialSettings();
  const est = flow.estimation.data as any;
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const [fitReport, setFitReport] = useState<ReportFitReport>({ compressed: [], overflowing: [] });
  const [currentPage, setCurrentPage] = useState(1);
  const [docHeight, setDocHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);


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
  const dataBlocked = hasBlockingIssue(checks);
  const layoutBlocked = fitReport.overflowing.length > 0;
  const noEngine = !est?.engine_output;
  const blocked = dataBlocked || layoutBlocked || noEngine;

  const blockingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (noEngine) reasons.push("Le calcul n'a pas encore été lancé pour cette estimation.");
    checks.filter((c) => c.level === "error").forEach((c) => reasons.push(c.detail ? `${c.label} — ${c.detail}` : c.label));
    fitReport.overflowing.forEach((o) => reasons.push(`La page ${o.page} (${o.title}) ne tient pas dans le format A4.`));
    return reasons;
  }, [checks, fitReport, noEngine]);

  const onFit = useCallback((r: ReportFitReport) => {
    setFitReport((prev) => {
      const same = prev.overflowing.length === r.overflowing.length
        && prev.compressed.length === r.compressed.length
        && prev.overflowing.every((o, i) => o.page === r.overflowing[i]?.page)
        && prev.compressed.every((c, i) => c.page === r.compressed[i]?.page);
      return same ? prev : r;
    });
  }, []);

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

  /** Hauteur réelle du document, pour que le zoom conserve un défilement correct. */
  useEffect(() => {
    const el = docRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setDocHeight(el.scrollHeight));
    ro.observe(el);
    setDocHeight(el.scrollHeight);
    return () => ro.disconnect();
  }, [data, photoUrls]);

  /** Page actuellement visible dans l'aperçu. */

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const pages = Array.from(el.querySelectorAll<HTMLElement>(".er-page"));
      const top = el.getBoundingClientRect().top;
      let active = 1;
      pages.forEach((page, i) => {
        if (page.getBoundingClientRect().top - top < 120) active = i + 1;
      });
      setCurrentPage(active);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [data]);

  const goToPage = (n: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const pages = Array.from(el.querySelectorAll<HTMLElement>(".er-page"));
    const target = pages[Math.max(0, Math.min(pages.length - 1, n - 1))];
    if (!target) return;
    el.scrollTo({ top: target.offsetTop * zoom - 8, behavior: "smooth" });
  };

  /**
   * Export PDF : une page logique de l'aperçu = exactement une page A4.
   * Chaque `.er-page` est rasterisée séparément puis posée sur sa propre feuille,
   * ce qui supprime toute fragmentation automatique (source des pages blanches).
   */
  const exportPdf = async () => {
    const el = document.getElementById("estimation-report");
    if (!el || !data) return;
    setExporting(true);
    const toastId = toast.loading("Génération du PDF…");
    // L'aperçu et le PDF partagent exactement le même rendu : on retire seulement
    // les décorations d'écran (ombre, bordure, marge inter-pages) le temps de l'export.
    el.classList.remove("er-preview");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const pages = Array.from(el.querySelectorAll<HTMLElement>(".er-page"));
      if (pages.length === 0) throw new Error("Aucune page à exporter.");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
        });
        const img = canvas.toDataURL("image/jpeg", 0.98);
        if (i > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }
      pdf.save(`Estimation-locative-${data.meta.reference}.pdf`);
      toast.success(`Rapport téléchargé — ${pages.length} pages`, { id: toastId });
    } catch (e: any) {
      toast.error(e?.message ?? "Export impossible", { id: toastId });
    } finally {
      el.classList.add("er-preview");
      setExporting(false);
    }
  };


  if (flow.estimation.isLoading) {
    return <div className="max-w-5xl mx-auto space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-[600px]" /></div>;
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

  const totalPages = data.pages.length;
  const zoomIndex = ZOOM_STEPS.indexOf(zoom) === -1 ? 4 : ZOOM_STEPS.indexOf(zoom);

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-24">
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
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/rapports/estimations/${id}`)}>
              <Pencil className="h-4 w-4 mr-2" strokeWidth={1.5} /> Modifier l'estimation
            </Button>
            <Button variant="outline" onClick={() => flow.compute.mutate()} disabled={flow.compute.isPending}>
              {flow.compute.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Générer le rapport
            </Button>
            <Button onClick={exportPdf} disabled={exporting || blocked}>
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />}
              Exporter en PDF
            </Button>
          </div>
        </div>
      </header>

      {blocked && (
        <section className="border-l-2 border-foreground pl-4 space-y-1">
          <h2 className="text-xs uppercase tracking-[0.24em]">Export bloqué</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            {blockingReasons.map((r) => <li key={r}>— {r}</li>)}
          </ul>
        </section>
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
          <li className="flex items-start gap-2 text-sm">
            {fitReport.overflowing.length === 0
              ? <Check className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />}
            <span>
              Mise en page A4 — aucun contenu coupé
              {fitReport.compressed.length > 0 && (
                <span className="block text-xs text-muted-foreground">
                  {fitReport.compressed.length} page(s) automatiquement ajustée(s) pour tenir dans la page.
                </span>
              )}
            </span>
          </li>
        </ul>
      </section>

      {/* Barre d'outils de l'aperçu */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-y py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} aria-label="Page précédente">
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <span className="text-xs font-mono tracking-wider tabular-nums">
            Page {currentPage} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} aria-label="Page suivante">
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setZoom(ZOOM_STEPS[Math.max(0, zoomIndex - 1)])} disabled={zoomIndex <= 0} aria-label="Dézoomer">
            <ZoomOut className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <span className="text-xs font-mono tabular-nums w-12 text-center">{Math.round(zoom * 100)} %</span>
          <Button variant="ghost" size="icon" onClick={() => setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1)])} disabled={zoomIndex >= ZOOM_STEPS.length - 1} aria-label="Zoomer">
            <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <section
        ref={scrollRef}
        className="overflow-auto bg-muted/30 p-4 max-h-[80vh]"
        style={{ scrollbarWidth: "thin" }}
      >
        <div style={{ width: `${210 * zoom}mm`, height: docHeight * zoom }}>
          <div
            ref={docRef}
            className="origin-top-left"
            style={{ transform: `scale(${zoom})`, width: "210mm" }}
          >
            <OwnerReportDocument data={data} photoUrls={photoUrls} preview onFit={onFit} />
          </div>
        </div>
      </section>

    </div>
  );
}

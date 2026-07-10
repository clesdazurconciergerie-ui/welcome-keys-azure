import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const METRIC_LABELS: Record<string, { label: string; unit?: string }> = {
  impressions: { label: "Impressions" },
  vues: { label: "Vues de la page" },
  taux_clic: { label: "Taux de clic", unit: "%" },
  taux_conversion: { label: "Taux de conversion", unit: "%" },
  reservations: { label: "Réservations" },
  revenus: { label: "Revenus", unit: "€" },
  nuits_reservees: { label: "Nuits réservées" },
  taux_occupation: { label: "Taux d'occupation", unit: "%" },
  prix_moyen_nuit: { label: "Prix moyen / nuit", unit: "€" },
  annulations: { label: "Annulations" },
};

type ReportRow = {
  id: string;
  property_slug: string;
  period: string;
  period_label: string | null;
  kpi_data: Record<string, { value: number | null; confidence?: number; source?: string }>;
  manual_data: any;
  analysis_text: any;
  screenshot_urls: string[];
  created_at: string;
};

export default function AirbnbReportView() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportRow | null>(null);
  const [property, setProperty] = useState<{ nom: string; ville: string; proprietaire: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await (supabase as any)
        .from("azurkeys_reports")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setReport(data as ReportRow);
      const { data: p } = await (supabase as any)
        .from("properties")
        .select("name, city")
        .eq("id", data.property_slug)
        .maybeSingle();
      if (p) setProperty({ nom: p.name, ville: p.city ?? "", proprietaire: null });
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="azurkeys-scope flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--az-muted))]" />
      </div>
    );
  }
  if (!report) {
    return (
      <div className="azurkeys-scope max-w-3xl mx-auto p-10 text-center">
        <p className="font-body text-[hsl(var(--az-muted))]">Rapport introuvable.</p>
        <Link to="/rapports" className="az-btn-ghost inline-block mt-4">Retour</Link>
      </div>
    );
  }

  const sections = report.analysis_text || {};
  const kpi = report.kpi_data || {};

  return (
    <div className="azurkeys-scope">
      {/* Toolbar — hidden in print */}
      <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between print:hidden">
        <Link to="/rapports" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))]">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </Link>
        <button onClick={() => window.print()} className="az-btn-primary">
          <Download className="w-4 h-4" /> Télécharger le PDF
        </button>
      </div>

      <div className="airbnb-report max-w-4xl mx-auto px-8 md:px-14 pb-16 bg-white">
        {/* 1. COUVERTURE */}
        <section className="report-page min-h-[70vh] flex flex-col justify-center text-center border-b border-[hsl(var(--az-line))] pb-16 mb-16">
          <p className="az-eyebrow mb-6">Azurkeys Properties</p>
          <h1 className="font-display text-5xl md:text-6xl mb-6">Rapport de performance</h1>
          <div className="az-divider max-w-xs mx-auto mb-8" />
          <p className="font-display text-3xl mb-2">{property?.nom ?? "—"}</p>
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))] uppercase tracking-[0.2em] mb-8">{property?.ville}</p>
          <p className="font-body text-lg capitalize">{report.period_label}</p>
          {property?.proprietaire && <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mt-8">Destiné à {property.proprietaire}</p>}
          <p className="font-body text-[11px] text-[hsl(var(--az-muted))] mt-4">Édité le {new Date(report.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
        </section>

        {/* 2. RÉSUMÉ EXÉCUTIF */}
        <Section eyebrow="01" title="Résumé exécutif">
          <p className="font-body text-[14px] leading-relaxed whitespace-pre-line">{sections.resume_executif || "—"}</p>
        </Section>

        {/* 3. KPI */}
        <Section eyebrow="02" title="Indicateurs du mois">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(METRIC_LABELS).map((k) => {
              const v = kpi[k];
              const hasValue = v?.value !== null && v?.value !== undefined;
              return (
                <div key={k} className="border border-[hsl(var(--az-line))] p-5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--az-muted))]">{METRIC_LABELS[k].label}</p>
                  <p className={`font-display text-3xl mt-2 ${!hasValue ? "text-[hsl(var(--az-muted))]" : ""}`}>
                    {hasValue ? `${v.value}${METRIC_LABELS[k].unit ?? ""}` : "non disponible"}
                  </p>
                </div>
              );
            })}
          </div>
          {sections.kpi_commentaire && (
            <p className="font-body text-[13px] text-[hsl(var(--az-muted))] mt-6 leading-relaxed whitespace-pre-line">{sections.kpi_commentaire}</p>
          )}
        </Section>

        {/* 4. TUNNEL */}
        <Section eyebrow="03" title="Tunnel de conversion">
          <ConversionFunnel kpi={kpi} />
          <p className="font-body text-[14px] leading-relaxed whitespace-pre-line mt-6">{sections.tunnel_conversion || "—"}</p>
        </Section>

        {/* 5. ANALYSE COMMERCIALE */}
        <Section eyebrow="04" title="Analyse commerciale">
          <p className="font-body text-[14px] leading-relaxed whitespace-pre-line">{sections.analyse_commerciale || "—"}</p>
        </Section>

        {/* 6. DIAGNOSTIC */}
        <Section eyebrow="05" title="Diagnostic">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: "Ce qui fonctionne", key: "fonctionne" },
              { title: "Ce qui bloque", key: "bloque" },
              { title: "Risques", key: "risques" },
              { title: "Opportunités", key: "opportunites" },
            ].map((c) => (
              <div key={c.key} className="border border-[hsl(var(--az-line))] p-5">
                <p className="az-eyebrow mb-3">{c.title}</p>
                <ul className="space-y-2">
                  {(sections.diagnostic?.[c.key] || []).map((t: string, i: number) => (
                    <li key={i} className="font-body text-[13px] leading-relaxed">— {t}</li>
                  ))}
                  {(!sections.diagnostic?.[c.key] || sections.diagnostic[c.key].length === 0) && (
                    <li className="font-body text-[12px] text-[hsl(var(--az-muted))]">Aucun élément</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. RECOMMANDATIONS */}
        <Section eyebrow="06" title="Recommandations">
          <ul className="space-y-3">
            {(sections.recommandations || []).map((r: any, i: number) => (
              <li key={i} className="border-l-2 border-[hsl(var(--az-gold))] pl-4">
                <p className="az-eyebrow mb-1">{r.categorie}</p>
                <p className="font-body text-[14px] leading-relaxed">{r.texte}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* 8. PLAN D'ACTION */}
        <Section eyebrow="07" title="Plan d'action du mois prochain">
          <div className="space-y-3">
            {(sections.plan_action || []).map((a: any, i: number) => (
              <div key={i} className="border border-[hsl(var(--az-line))] p-4 flex items-start gap-4">
                <span className="font-display text-2xl text-[hsl(var(--az-gold))]">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <p className="font-body text-[14px] leading-relaxed">{a.action}</p>
                  <p className="text-[11px] text-[hsl(var(--az-muted))] mt-1">
                    Priorité <strong className="uppercase">{a.priorite}</strong> · Impact attendu : {a.impact_attendu}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 9. CONCLUSION */}
        <Section eyebrow="08" title="Conclusion">
          <p className="font-body text-[15px] leading-relaxed whitespace-pre-line italic">{sections.conclusion_proprietaire || "—"}</p>
          <div className="mt-8 pt-8 border-t border-[hsl(var(--az-line))] text-center">
            <p className="az-eyebrow">Azurkeys Properties · Conciergerie premium</p>
          </div>
        </Section>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white !important; }
          .airbnb-report { max-width: 100% !important; padding: 0 !important; }
          .report-page { page-break-after: always; }
          section { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <p className="az-eyebrow mb-2">{eyebrow}</p>
      <h2 className="font-display text-3xl mb-6 pb-3 border-b border-[hsl(var(--az-line))]">{title}</h2>
      {children}
    </section>
  );
}

function ConversionFunnel({ kpi }: { kpi: Record<string, { value: number | null }> }) {
  const steps = [
    { key: "impressions", label: "Impressions" },
    { key: "vues", label: "Vues" },
    { key: "reservations", label: "Réservations" },
  ];
  const values = steps.map((s) => kpi[s.key]?.value ?? null);
  const max = Math.max(...values.filter((v): v is number => v !== null), 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const v = values[i];
        const pct = v !== null ? Math.max(8, (v / max) * 100) : 8;
        return (
          <div key={s.key} className="flex items-center gap-4">
            <p className="w-32 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--az-muted))]">{s.label}</p>
            <div className="flex-1 h-10 bg-[hsl(var(--az-sand))] relative">
              <div className="h-full bg-[hsl(var(--az-ink))]" style={{ width: `${pct}%` }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-body text-[13px]">
                {v !== null ? v.toLocaleString("fr-FR") : "n/d"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

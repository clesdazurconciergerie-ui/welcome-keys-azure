import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProperties } from "@/hooks/useProperties";

type ReportRow = {
  id: string;
  period: string;
  period_label: string | null;
  kpi_data: Record<string, { value: number | null }>;
  status: string;
  created_at: string;
};

export default function AirbnbReportsHistory() {
  const { slug } = useParams<{ slug: string }>(); // slug = property.id
  const { properties } = useProperties();
  const property = properties.find((p) => p.id === slug);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: rows } = await (supabase as any)
        .from("azurkeys_reports")
        .select("id, period, period_label, kpi_data, status, created_at")
        .eq("property_slug", slug)
        .order("period", { ascending: false });
      setReports((rows ?? []) as ReportRow[]);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="azurkeys-scope max-w-5xl mx-auto px-6 py-10">
      <Link to="/rapports" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))] mb-8">
        <ArrowLeft className="w-3.5 h-3.5" /> Retour
      </Link>

      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="az-eyebrow mb-2">Historique</p>
          <h1 className="font-display text-4xl">{property?.name ?? "Logement"}</h1>
          <p className="font-body text-[12px] text-[hsl(var(--az-muted))] mt-1">{property?.city ?? property?.address}</p>
        </div>
        <Link to={`/rapports/airbnb/nouveau?property=${slug}`} className="az-btn-primary">
          <Plus className="w-4 h-4" /> Nouveau rapport
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--az-muted))]" /></div>
      ) : reports.length === 0 ? (
        <div className="az-card p-8 text-center">
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))]">Aucun rapport pour ce logement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r, i) => {
            const revNow = r.kpi_data?.revenus?.value;
            const revPrev = reports[i + 1]?.kpi_data?.revenus?.value;
            const delta = revNow !== null && revNow !== undefined && revPrev !== null && revPrev !== undefined
              ? ((revNow - revPrev) / (revPrev || 1)) * 100 : null;
            const isDraft = r.status === "draft";
            const link = isDraft ? `/rapports/airbnb/nouveau?draft=${r.id}` : `/rapports/airbnb/${r.id}`;
            return (
              <Link key={r.id} to={link} className="az-card p-5 flex items-center justify-between hover:bg-[hsl(var(--az-sand))]">
                <div className="flex items-center gap-4">
                  <FileText className={`w-4 h-4 ${isDraft ? "text-[hsl(var(--az-gold))]" : "text-[hsl(var(--az-muted))]"}`} />
                  <div>
                    <p className="font-body text-[14px] capitalize">{r.period_label ?? r.period}</p>
                    <p className="text-[11px] text-[hsl(var(--az-muted))]">
                      {isDraft ? "Brouillon — à compléter" : `Édité le ${new Date(r.created_at).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl">{revNow !== null && revNow !== undefined ? `${revNow.toLocaleString("fr-FR")} €` : "—"}</p>
                  {delta !== null && (
                    <p className={`text-[11px] ${delta >= 0 ? "text-green-700" : "text-orange-600"}`}>
                      {delta >= 0 ? "+" : ""}{delta.toFixed(1)}% vs mois précédent
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import "@/styles/estimation-scope.css";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import type { EstimationFormData } from "@/lib/estimation/types";
import type { EstimationResult } from "@/lib/estimation/engine";
import { formatEur, formatPct } from "@/lib/estimation/format";

/**
 * PHASE 3/4 — aperçu WYSIWYG minimal (résultat moteur).
 * Le rapport 11 blocs + moteur de pagination (§6 du prompt) arrivent
 * aux phases 5-6. Cet écran valide que le moteur produit des chiffres
 * cohérents et que la charte est correctement scopée.
 */
export default function EstimationReportPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState<{ form: EstimationFormData; result: EstimationResult } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); return; }
    const raw = sessionStorage.getItem(`estim.result.${id}`);
    if (!raw) { setNotFound(true); return; }
    try { setPayload(JSON.parse(raw)); } catch { setNotFound(true); }
  }, [id]);

  if (notFound) {
    return (
      <div className="estim-scope min-h-[60vh]">
        <div className="max-w-3xl mx-auto py-16 px-6">
          <Link to="/rapports" className="e-eyebrow inline-flex items-center gap-2 mb-10"><ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Retour</Link>
          <h1 className="text-4xl mb-4">Estimation introuvable</h1>
          <p className="e-italic text-lg text-[color:var(--e-text)]">Cette estimation n'existe pas dans la session courante.</p>
          <Link to="/rapports/estimation/nouveau" className="e-btn mt-6 inline-flex">Nouvelle estimation</Link>
        </div>
      </div>
    );
  }
  if (!payload) return <div className="estim-scope min-h-[60vh]" />;
  const { form, result } = payload;

  return (
    <div className="estim-scope min-h-[60vh]">
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="flex items-center justify-between mb-10 print:hidden">
          <Link to="/rapports/estimation/nouveau" className="e-eyebrow inline-flex items-center gap-2 hover:text-[color:var(--e-ink)]">
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Nouvelle
          </Link>
          <button onClick={() => window.print()} className="e-btn">
            <Printer className="w-3.5 h-3.5" strokeWidth={1.5} /> Imprimer
          </button>
        </div>

        <p className="e-eyebrow mb-3">Estimation locative exclusive · aperçu</p>
        <h1 className="text-4xl md:text-5xl mb-2">{result.category_label}</h1>
        <p className="e-italic text-lg text-[color:var(--e-text)]">
          {form.bien.surface_m2} m² · {form.bien.voyageurs} voyageurs · {form.bien.chambres} ch. · {form.localisation.ville}
        </p>

        <hr className="e-hairline my-8" />

        <div className="grid grid-cols-3 gap-6 mb-10">
          <KPI label="Revenu estimé / an" value={formatEur(result.revenu_annuel_eur)} />
          <KPI label="Potentiel optimisé" value={formatEur(result.revenu_annuel_optimise_eur)} sub={`+${result.uplift_pct}%`} />
          <KPI label="Prix haute saison / nuit" value={formatEur(result.price_haute_eur)} />
        </div>

        <h2 className="text-2xl mb-4">Tarification saisonnière</h2>
        <div className="grid grid-cols-3 gap-4 mb-10">
          {result.saisons.map((s) => (
            <div key={s.saison} className="p-5 bg-[color:var(--e-ink)] text-[color:var(--e-paper)]">
              <p className="e-label mb-2" style={{ color: "var(--e-text-mute)" }}>Saison {s.saison}</p>
              <p className="text-2xl mb-1" style={{ fontFamily: "var(--e-title)" }}>{formatEur(s.prix_nuit_eur)}</p>
              <p className="text-xs opacity-70 mb-3">Week-end : {formatEur(s.prix_weekend_eur)}</p>
              <p className="text-xs opacity-70">{s.nuits} nuits · {formatPct(s.occupation_pct)}</p>
              <p className="text-xs opacity-70 mt-1">Revenu : {formatEur(s.revenu_eur)}</p>
            </div>
          ))}
        </div>

        <h2 className="text-2xl mb-4">Fourchettes de marché</h2>
        <p className="e-italic text-sm text-[color:var(--e-text)] mb-4">biens similaires dans la zone</p>
        <div className="grid grid-cols-3 gap-4 mb-10">
          {(["p50","p70","p85"] as const).map((k) => (
            <div key={k} className="p-4 border border-[color:var(--e-line)]">
              <p className="e-label mb-2">{k === "p50" ? "Médiane P50" : k === "p70" ? "Quartile P70" : "Top 15% P85"}</p>
              <p className="text-xl" style={{ fontFamily: "var(--e-title)" }}>{formatEur(result.fourchettes_annuelles[k])}</p>
            </div>
          ))}
        </div>

        <div className="p-6 bg-[color:var(--e-ink)] text-[color:var(--e-paper)]">
          <p className="e-label mb-2" style={{ color: "var(--e-text-mute)" }}>Score d'optimisation</p>
          <p className="text-5xl" style={{ fontFamily: "var(--e-title)" }}>{result.score.total}/100</p>
          <p className="e-italic mt-3 opacity-80">
            {result.score.total >= 80
              ? "Excellent potentiel · Optimisation mineure requise"
              : result.score.total >= 60
              ? "Bon potentiel · Axes d'amélioration identifiés"
              : "Potentiel significatif · Optimisation recommandée"}
          </p>
        </div>

        <p className="e-italic text-xs text-[color:var(--e-text-soft)] mt-10 text-center">
          Aperçu du moteur d'estimation. Le rapport A4 complet (11 blocs, moteur de pagination, carte,
          comparables, recommandations IA) arrive aux phases suivantes.
        </p>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="e-label mb-2">{label}</p>
      <p className="text-2xl" style={{ fontFamily: "var(--e-title)" }}>{value}</p>
      {sub && <p className="e-italic text-sm text-[color:var(--e-text)] mt-1">{sub}</p>}
    </div>
  );
}

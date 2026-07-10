import "@/styles/estimation-scope.css";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * PHASE 1 — placeholder de structure.
 * Le rapport WYSIWYG A4 210mm (11 blocs, moteur de pagination, window.print())
 * sera livré aux phases 5-6.
 */
export default function EstimationReportPage() {
  const { id } = useParams();
  return (
    <div className="estim-scope min-h-[60vh]">
      <div className="max-w-3xl mx-auto py-16 px-6">
        <Link
          to="/rapports"
          className="e-eyebrow inline-flex items-center gap-2 mb-10 hover:text-[color:var(--e-ink)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          Retour
        </Link>

        <p className="e-eyebrow mb-4">Rapport · {id}</p>
        <h1 className="text-4xl md:text-5xl mb-4">Estimation locative exclusive</h1>
        <p className="e-italic text-xl text-[color:var(--e-text)] mb-8">
          Rendu WYSIWYG A4 · impression navigateur native
        </p>
        <hr className="e-hairline mb-8" />
        <p className="text-sm text-[color:var(--e-text)] leading-relaxed max-w-xl">
          Le rapport 11 blocs et son moteur de pagination JS (§6 du prompt)
          arrivent aux phases 5-6.
        </p>
      </div>
    </div>
  );
}

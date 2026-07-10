import "@/styles/estimation-scope.css";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * PHASE 1 — placeholder de structure.
 * Le wizard complet (7 étapes, validation zod, état persistant) sera
 * livré en phase 2, une fois validés les 6 points d'arbitrage du plan.
 */
export default function EstimationWizardPage() {
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

        <p className="e-eyebrow mb-4">Module en préparation</p>
        <h1 className="text-4xl md:text-5xl mb-4">Nouvelle estimation locative</h1>
        <p className="e-italic text-xl text-[color:var(--e-text)] mb-8">
          Formulaire multi-étapes · calcul déterministe · rapport A4 premium
        </p>
        <hr className="e-hairline mb-8" />
        <p className="text-sm text-[color:var(--e-text)] leading-relaxed max-w-xl">
          La structure est en place. Le formulaire complet arrive en phase 2 dès
          validation du barème du moteur d'estimation (P50 / P70 / P85, poids
          du score, coefficients saisonniers). Voir <code>.lovable/plan.md</code>.
        </p>
      </div>
    </div>
  );
}

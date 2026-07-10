import { Link } from "react-router-dom";
import { useAzurkeysProperties } from "@/hooks/useAzurkeysProperties";
import { ArrowRight, Home, Loader2, Sparkles } from "lucide-react";

export default function RapportsHome() {
  const { properties, isLoading, error } = useAzurkeysProperties();
  const active = properties.filter((p) => p.active);

  return (
    <div className="azurkeys-scope max-w-6xl mx-auto px-6 py-12 space-y-14">
      {/* Hero */}
      <section className="text-center pt-8 pb-4">
        <p className="az-eyebrow mb-4">Édition mensuelle</p>
        <h1 className="font-display text-5xl md:text-6xl leading-tight mb-4">
          Azurkeys Report
        </h1>
        <p className="font-body text-[13px] text-[hsl(var(--az-muted))] max-w-xl mx-auto leading-relaxed">
          Rapports de performance premium pour vos logements Airbnb, générés à partir de vos statistiques
          et enrichis d'une analyse rédigée.
        </p>
        <div className="az-divider mt-10 max-w-xs mx-auto" />
      </section>

      {/* Actions */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="az-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-4 h-4 text-[hsl(var(--az-gold))]" strokeWidth={1.6} />
            <span className="az-eyebrow">Nouveau rapport</span>
          </div>
          <h2 className="font-display text-2xl mb-3">Générer un rapport mensuel</h2>
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))] leading-relaxed mb-6">
            Importez les captures d'écran Airbnb d'un logement, validez les chiffres extraits, puis obtenez
            un PDF premium prêt à envoyer au propriétaire.
          </p>
          <Link to="/rapports/airbnb/nouveau" className="az-btn-primary">
            Nouveau rapport
          </Link>
        </div>

        <div className="az-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <Home className="w-4 h-4 text-[hsl(var(--az-gold))]" strokeWidth={1.6} />
            <span className="az-eyebrow">Portefeuille</span>
          </div>
          <h2 className="font-display text-2xl mb-3">
            {isLoading ? "…" : `${active.length} logement${active.length > 1 ? "s" : ""} actif${active.length > 1 ? "s" : ""}`}
          </h2>
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))] leading-relaxed mb-6">
            Gérez le portefeuille de biens couverts par la conciergerie : ajout, modification, désactivation.
          </p>
          <Link to="/rapports/logements" className="az-btn-ghost inline-flex items-center gap-2">
            Gérer les logements
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      {/* Property preview */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="az-eyebrow mb-1">Portefeuille</p>
            <h3 className="font-display text-3xl">Logements suivis</h3>
          </div>
          <Link
            to="/rapports/logements"
            className="font-body text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--az-muted))] hover:text-[hsl(var(--az-ink))] transition-colors"
          >
            Voir tout →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--az-muted))]" />
          </div>
        ) : error ? (
          <div className="az-card p-6 text-[13px] font-body text-[hsl(var(--az-muted))]">
            Impossible de charger les logements. Assurez-vous que la table <code>azurkeys_properties</code> a
            bien été créée (voir <code>docs/azurkeys-report-schema.sql</code>).
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.slice(0, 9).map((p) => (
              <div key={p.id} className="az-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="az-eyebrow text-[hsl(var(--az-muted))]">{p.ville}</p>
                  {!p.active && (
                    <span className="text-[9px] uppercase tracking-widest text-[hsl(var(--az-muted))] border border-[hsl(var(--az-line))] rounded-full px-2 py-0.5">
                      Inactif
                    </span>
                  )}
                </div>
                <h4 className="font-display text-xl mb-1">{p.nom}</h4>
                {p.proprietaire && (
                  <p className="font-body text-[12px] text-[hsl(var(--az-muted))]">{p.proprietaire}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

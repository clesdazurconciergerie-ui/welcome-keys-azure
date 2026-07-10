import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useProperties } from "@/hooks/useProperties";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Home, Loader2, Sparkles, Wand2, FileText } from "lucide-react";
import { toast } from "sonner";

type DraftRow = {
  id: string;
  property_slug: string;
  period: string;
  period_label: string | null;
  status: string;
};

export default function RapportsHome() {
  const { properties, isLoading } = useProperties();
  const active = properties.filter((p) => p.status !== "archived");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [preparing, setPreparing] = useState(false);

  const fetchDrafts = async () => {
    const { data } = await (supabase as any)
      .from("azurkeys_reports")
      .select("id, property_slug, period, period_label, status")
      .eq("status", "draft")
      .order("period", { ascending: false });
    setDrafts((data ?? []) as DraftRow[]);
  };

  useEffect(() => { fetchDrafts(); }, []);

  const prepareDrafts = async () => {
    setPreparing(true);
    try {
      const { data, error } = await supabase.functions.invoke("prepare-airbnb-report-drafts", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${data.created_count} brouillon(s) préparé(s) pour ${data.label}`);
      await fetchDrafts();
    } catch (e: any) {
      toast.error(`Préparation : ${e.message ?? "erreur"}`);
    } finally {
      setPreparing(false);
    }
  };

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? "Logement";

  return (
    <div className="azurkeys-scope max-w-6xl mx-auto px-6 py-12 space-y-14">
      <section className="text-center pt-8 pb-4">
        <p className="az-eyebrow mb-4">Édition mensuelle</p>
        <h1 className="font-display text-5xl md:text-6xl leading-tight mb-4">Azurkeys Report</h1>
        <p className="font-body text-[13px] text-[hsl(var(--az-muted))] max-w-xl mx-auto leading-relaxed">
          Rapports de performance premium générés à partir de vos données de conciergerie et de vos captures Airbnb.
        </p>
        <div className="az-divider mt-10 max-w-xs mx-auto" />
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="az-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-4 h-4 text-[hsl(var(--az-gold))]" strokeWidth={1.6} />
            <span className="az-eyebrow">Nouveau rapport</span>
          </div>
          <h2 className="font-display text-2xl mb-3">Créer un rapport</h2>
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))] leading-relaxed mb-6">
            Choisissez un logement, importez les captures Airbnb et générez le PDF.
          </p>
          <Link to="/rapports/airbnb/nouveau" className="az-btn-primary">Nouveau rapport</Link>
        </div>

        <div className="az-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <Wand2 className="w-4 h-4 text-[hsl(var(--az-gold))]" strokeWidth={1.6} />
            <span className="az-eyebrow">Automatisation</span>
          </div>
          <h2 className="font-display text-2xl mb-3">Préparer les brouillons</h2>
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))] leading-relaxed mb-6">
            Une semaine avant la fin du mois, on prépare la base : revenus, nuitées, occupation. Vous n'aurez qu'à ajouter les captures.
          </p>
          <button onClick={prepareDrafts} disabled={preparing} className="az-btn-primary">
            {preparing ? <><Loader2 className="w-4 h-4 animate-spin" /> Préparation…</> : "Préparer maintenant"}
          </button>
        </div>

        <div className="az-card p-8">
          <div className="flex items-center gap-3 mb-4">
            <Home className="w-4 h-4 text-[hsl(var(--az-gold))]" strokeWidth={1.6} />
            <span className="az-eyebrow">Portefeuille</span>
          </div>
          <h2 className="font-display text-2xl mb-3">
            {isLoading ? "…" : `${active.length} logement${active.length > 1 ? "s" : ""}`}
          </h2>
          <p className="font-body text-[13px] text-[hsl(var(--az-muted))] leading-relaxed mb-6">
            Les logements viennent directement de votre conciergerie.
          </p>
          <Link to="/dashboard/logements" className="az-btn-ghost inline-flex items-center gap-2">
            Gérer les logements <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      {drafts.length > 0 && (
        <section>
          <p className="az-eyebrow mb-1">À compléter</p>
          <h3 className="font-display text-3xl mb-6">Brouillons en attente</h3>
          <div className="space-y-3">
            {drafts.map((d) => (
              <Link
                key={d.id}
                to={`/rapports/airbnb/nouveau?draft=${d.id}`}
                className="az-card p-5 flex items-center justify-between hover:bg-[hsl(var(--az-sand))]"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-4 h-4 text-[hsl(var(--az-gold))]" />
                  <div>
                    <p className="font-body text-[14px]">{propertyName(d.property_slug)}</p>
                    <p className="text-[11px] text-[hsl(var(--az-muted))] capitalize">{d.period_label ?? d.period}</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-[hsl(var(--az-muted))] border border-[hsl(var(--az-line))] px-3 py-1">
                  Brouillon
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p className="az-eyebrow mb-1">Portefeuille</p>
            <h3 className="font-display text-3xl">Logements suivis</h3>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--az-muted))]" /></div>
        ) : active.length === 0 ? (
          <div className="az-card p-8 text-center">
            <p className="font-body text-[13px] text-[hsl(var(--az-muted))]">
              Ajoutez d'abord des logements dans la conciergerie pour commencer.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.slice(0, 9).map((p) => (
              <Link key={p.id} to={`/rapports/airbnb/logement/${p.id}`} className="az-card p-5 block">
                <p className="az-eyebrow text-[hsl(var(--az-muted))] mb-3">{p.city ?? "—"}</p>
                <h4 className="font-display text-xl mb-1">{p.name}</h4>
                <p className="font-body text-[12px] text-[hsl(var(--az-muted))]">{p.address}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

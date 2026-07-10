import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import "@/styles/estimation-scope.css";
import { estimate, type EstimationResult } from "@/lib/estimation/engine";
import type { EstimationFormData } from "@/lib/estimation/types";
import { formatEur, formatPct } from "@/lib/estimation/format";

// ─────────────────────────────────────────────────────────────
// Rapport A4 portrait — 6 pages :
//   1. Couverture
//   2. Présentation du bien + tarification saisonnière
//   3. Stratégie & projections annuelles
//   4. Comparables marché + carte
//   5. Optimisations recommandées + galerie photos
//   6. Score global + pied de rapport
// ─────────────────────────────────────────────────────────────

interface Payload {
  form: EstimationFormData;
  result: EstimationResult;
  generatedAt: string;
}

function loadPayload(id: string | undefined): Payload | null {
  try {
    const raw = sessionStorage.getItem("estimation:last");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      id?: string;
      form: EstimationFormData;
      result?: EstimationResult;
      generatedAt?: string;
    };
    // On accepte l'entrée courante quel que soit l'id — le moteur est déterministe.
    const result = parsed.result ?? estimate(parsed.form);
    return {
      form: parsed.form,
      result,
      generatedAt: parsed.generatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export default function EstimationReportPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => { setPayload(loadPayload(id)); }, [id]);

  const dateFR = useMemo(() => {
    if (!payload) return "";
    return new Date(payload.generatedAt).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }, [payload]);

  if (!payload) {
    return (
      <div className="estim-scope min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="e-eyebrow mb-4">Aucune estimation en mémoire</p>
          <Link to="/rapports/estimation/nouveau" className="e-btn">
            Nouvelle estimation
          </Link>
        </div>
      </div>
    );
  }

  const { form, result } = payload;
  const cover = form.photos.items.find((p) => p.couverture) ?? form.photos.items[0];
  const gallery = form.photos.items.filter((p) => p !== cover).slice(0, 6);
  const seasonMap = Object.fromEntries(result.saisons.map((s) => [s.saison, s]));

  return (
    <div className="estim-scope">
      {/* Barre d'actions (masquée à l'impression) */}
      <div className="print:hidden max-w-[210mm] mx-auto flex items-center justify-between px-6 py-6">
        <Link to="/rapports/estimation/nouveau" className="e-eyebrow inline-flex items-center gap-2 hover:text-[color:var(--e-ink)]">
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Nouvelle estimation
        </Link>
        <button onClick={() => window.print()} className="e-btn">
          <Printer className="w-3.5 h-3.5" strokeWidth={1.5} /> Imprimer / PDF
        </button>
      </div>

      {/* ───── PAGE 1 · Couverture ───── */}
      <section className="e-page e-page--dark flex flex-col">
        <div className="flex items-center justify-between">
          <p className="e-eyebrow" style={{ color: "rgba(245,245,240,0.6)" }}>Azurkeys Properties</p>
          <p className="e-eyebrow" style={{ color: "rgba(245,245,240,0.6)" }}>{dateFR}</p>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <p className="e-italic text-lg mb-6" style={{ color: "rgba(245,245,240,0.8)" }}>
            Estimation locative confidentielle
          </p>
          <h1 className="text-[64px] leading-[1.05] mb-8" style={{ color: "var(--e-paper)" }}>
            {result.category_label}<br />
            à {form.localisation.ville}
          </h1>
          <div className="e-hairline my-6" style={{ width: "80px" }} />
          <p className="e-italic text-2xl max-w-[140mm]" style={{ color: "rgba(245,245,240,0.85)" }}>
            {form.bien.surface_m2} m² · {form.bien.chambres} chambre{form.bien.chambres > 1 ? "s" : ""} ·
            {" "}jusqu'à {form.bien.voyageurs} voyageurs.
          </p>
        </div>

        {cover && (
          <div className="mb-6" style={{ maxHeight: "80mm", overflow: "hidden" }}>
            <img src={cover.data_url} alt="Couverture"
              className="w-full h-[80mm] object-cover" style={{ filter: "grayscale(15%)" }} />
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 pt-6" style={{ borderTop: "1px solid rgba(245,245,240,0.2)" }}>
          <div>
            <p className="e-label mb-2" style={{ color: "rgba(245,245,240,0.5)" }}>Rapport pour</p>
            <p className="text-sm" style={{ color: "var(--e-paper)" }}>{form.contact.nom || "—"}</p>
          </div>
          <div>
            <p className="e-label mb-2" style={{ color: "rgba(245,245,240,0.5)" }}>Localisation</p>
            <p className="text-sm" style={{ color: "var(--e-paper)" }}>{form.localisation.ville} · {form.localisation.code_postal}</p>
          </div>
          <div>
            <p className="e-label mb-2" style={{ color: "rgba(245,245,240,0.5)" }}>Édité par</p>
            <p className="text-sm" style={{ color: "var(--e-paper)" }}>Azurkeys · Côte d'Azur</p>
          </div>
        </div>

        <div className="e-footnote">
          <span>Azurkeys Properties · Confidentiel</span>
          <span>01 / 06</span>
        </div>
      </section>

      {/* ───── PAGE 2 · Présentation + tarification ───── */}
      <section className="e-page">
        <p className="e-eyebrow mb-2">Chapitre 01</p>
        <h2 className="text-4xl mb-6">Présentation du bien</h2>
        <hr className="e-hairline mb-8" />

        <div className="grid grid-cols-2 gap-x-10 gap-y-5 mb-10">
          <Line label="Type" value={form.bien.type === "bien_entier" ? "Bien entier" : "Partie de villa"} />
          <Line label="Surface" value={`${form.bien.surface_m2} m²`} />
          <Line label="Chambres" value={String(form.bien.chambres)} />
          <Line label="Salles de bain" value={String(form.bien.sdb)} />
          <Line label="Capacité" value={`${form.bien.voyageurs} voyageurs`} />
          <Line label="Extérieur" value={form.exterieur.type === "aucun" ? "—" : form.exterieur.type} />
          <Line label="Piscine" value={form.exterieur.piscine === "aucune" ? "Aucune" : form.exterieur.piscine === "privee" ? "Privée" : "Collective"} />
          <Line label="Vue" value={viewLabel(form.exterieur.vue)} />
          <Line label="Standing" value={cap1(form.equipement.standing)} />
          <Line label="Distance plage" value={form.localisation.distance_plage_m != null ? `${form.localisation.distance_plage_m} m` : "—"} />
        </div>

        <h3 className="text-2xl mb-4">Tarification saisonnière recommandée</h3>
        <p className="e-italic text-sm text-[color:var(--e-text)] mb-6">
          Prix nuitée hors frais de ménage, taxe de séjour et service Azurkeys.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {(["basse","moyenne","haute"] as const).map((k) => {
            const s = seasonMap[k];
            return (
              <div key={k} className="p-5 bg-[color:var(--e-ink)] text-[color:var(--e-paper)]">
                <p className="e-label mb-2" style={{ color: "rgba(245,245,240,0.55)" }}>Saison {k}</p>
                <p className="e-kpi-num mb-2">{formatEur(s.prix_nuit_eur)}</p>
                <p className="text-[10px] opacity-70 mb-1">Week-end : {formatEur(s.prix_weekend_eur)}</p>
                <p className="text-[10px] opacity-70">Occupation cible {formatPct(s.occupation_pct)}</p>
              </div>
            );
          })}
        </div>

        <div className="e-footnote">
          <span>Présentation & tarification</span>
          <span>02 / 06</span>
        </div>
      </section>

      {/* ───── PAGE 3 · Stratégie + projections ───── */}
      <section className="e-page">
        <p className="e-eyebrow mb-2">Chapitre 02</p>
        <h2 className="text-4xl mb-6">Stratégie & projections</h2>
        <hr className="e-hairline mb-8" />

        <h3 className="text-xl mb-4">Positionnement</h3>
        <p className="text-sm leading-relaxed text-[color:var(--e-text-strong)] mb-6">
          {form.strategie.clientele_cible?.trim() ||
            "Clientèle premium à la recherche d'un séjour authentique sur la Côte d'Azur : couples en escapade, familles, voyageurs d'affaires en télétravail."}
        </p>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="e-label mb-2">Atouts identifiés</p>
            <p className="text-sm leading-relaxed text-[color:var(--e-text-strong)]">
              {form.strategie.atouts?.trim() || autoAtouts(form)}
            </p>
          </div>
          <div>
            <p className="e-label mb-2">Axes de vigilance</p>
            <p className="text-sm leading-relaxed text-[color:var(--e-text-strong)]">
              {form.strategie.faiblesses?.trim() || autoFaiblesses(form)}
            </p>
          </div>
        </div>

        <h3 className="text-xl mb-4">Projection de revenus annuels</h3>
        <table className="e-table mb-6">
          <thead>
            <tr><th>Saison</th><th>Prix moyen</th><th>Nuitées</th><th>Occupation</th><th style={{ textAlign: "right" }}>Revenu</th></tr>
          </thead>
          <tbody>
            {result.saisons.map((s) => (
              <tr key={s.saison}>
                <td>{cap1(s.saison)}</td>
                <td>{formatEur(s.prix_nuit_eur)}</td>
                <td>{s.nuits}</td>
                <td>{formatPct(s.occupation_pct)}</td>
                <td style={{ textAlign: "right" }}>{formatEur(s.revenu_eur)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className="e-label">Total annuel estimé</td>
              <td style={{ textAlign: "right" }} className="e-kpi-num !text-lg">
                {formatEur(result.revenu_annuel_eur)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-3 gap-4">
          <MiniKpi label="Prix haute saison" value={formatEur(result.price_haute_eur) + " / nuit"} />
          <MiniKpi label="Percentile appliqué" value={result.price_percentile.toUpperCase()} />
          <MiniKpi label="Calibration" value={calibrationLabel(result.calibration)} />
        </div>

        <div className="e-footnote">
          <span>Stratégie & projections</span>
          <span>03 / 06</span>
        </div>
      </section>

      {/* ───── PAGE 4 · Comparables + carte ───── */}
      <section className="e-page">
        <p className="e-eyebrow mb-2">Chapitre 03</p>
        <h2 className="text-4xl mb-6">Marché & comparables</h2>
        <hr className="e-hairline mb-8" />

        <h3 className="text-xl mb-4">Fourchettes annuelles observées</h3>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <RangeCard label="Médiane · P50" value={formatEur(result.fourchettes_annuelles.p50)} />
          <RangeCard label="Bon segment · P70" value={formatEur(result.fourchettes_annuelles.p70)} highlight={result.price_percentile === "p70"} />
          <RangeCard label="Top 15 % · P85" value={formatEur(result.fourchettes_annuelles.p85)} highlight={result.price_percentile === "p85"} />
        </div>

        <h3 className="text-xl mb-4">Comparables retenus</h3>
        <table className="e-table mb-8">
          <thead>
            <tr><th>Bien</th><th>ADR</th><th>Occupation</th><th style={{ textAlign: "right" }}>Revenu annuel</th></tr>
          </thead>
          <tbody>
            {(form.donnees_marche.airdna?.comparables ?? []).slice(0, 8).map((c, i) => (
              <tr key={i}>
                <td>{c.nom}</td>
                <td>{formatEur(c.adr_eur)}</td>
                <td>{formatPct(c.occupation_pct)}</td>
                <td style={{ textAlign: "right" }}>{formatEur(c.revenu_annuel_eur)}</td>
              </tr>
            ))}
            {(form.donnees_marche.airdna?.comparables ?? []).length === 0 && (
              <tr><td colSpan={4} className="e-italic text-[color:var(--e-text-soft)] py-6 text-center">
                Aucun comparable AirDNA transmis — page réservée pour intégration ultérieure.
              </td></tr>
            )}
          </tbody>
        </table>

        <h3 className="text-xl mb-4">Situation</h3>
        <div className="relative border border-[color:var(--e-line)] h-[70mm] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,var(--e-line) 0,var(--e-line) 1px,transparent 1px,transparent 12mm)," +
              "repeating-linear-gradient(90deg,var(--e-line) 0,var(--e-line) 1px,transparent 1px,transparent 12mm)",
          }} />
          <div className="relative text-center">
            <span className="e-map-pin mb-3" />
            <p className="e-label mt-3">{form.localisation.ville}</p>
            <p className="e-italic text-sm mt-1 text-[color:var(--e-text)]">
              {form.localisation.quartier || form.localisation.adresse || "Côte d'Azur"}
            </p>
          </div>
        </div>

        <div className="e-footnote">
          <span>Comparables & carte</span>
          <span>04 / 06</span>
        </div>
      </section>

      {/* ───── PAGE 5 · Optimisations + galerie ───── */}
      <section className="e-page">
        <p className="e-eyebrow mb-2">Chapitre 04</p>
        <h2 className="text-4xl mb-6">Optimisations recommandées</h2>
        <hr className="e-hairline mb-8" />

        <p className="e-italic text-lg text-[color:var(--e-text)] mb-6">
          Recommandations concrètes pour rehausser l'attractivité et le prix moyen.
        </p>

        <ul className="space-y-4 mb-10">
          {buildRecommendations(form, result).map((r, i) => (
            <li key={i} className="grid grid-cols-[24px_1fr] gap-3">
              <span className="e-italic text-[color:var(--e-text-mute)]">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-sm font-medium mb-1">{r.title}</p>
                <p className="text-xs text-[color:var(--e-text)] leading-relaxed">{r.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        {gallery.length > 0 && (
          <>
            <h3 className="text-xl mb-4">Galerie</h3>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((p) => (
                <img key={p.id} src={p.data_url} alt={p.name}
                  className="w-full h-[42mm] object-cover" style={{ filter: "grayscale(10%)" }} />
              ))}
            </div>
          </>
        )}

        <div className="e-footnote">
          <span>Optimisations & galerie</span>
          <span>05 / 06</span>
        </div>
      </section>

      {/* ───── PAGE 6 · Score + pied ───── */}
      <section className="e-page flex flex-col">
        <p className="e-eyebrow mb-2">Chapitre 05</p>
        <h2 className="text-4xl mb-6">Score global & synthèse</h2>
        <hr className="e-hairline mb-8" />

        <div className="grid grid-cols-[1fr_180px] gap-10 mb-10">
          <div>
            <p className="e-italic text-lg text-[color:var(--e-text)] mb-4">
              Score d'optimisation calculé à partir du barème Azurkeys — standing, photos, extérieurs, vue, distance plage, équipements, rénovation, capacité.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <ScoreLine label="Standing" v={result.score.standing} />
              <ScoreLine label="Photos" v={result.score.photos} />
              <ScoreLine label="Piscine" v={result.score.piscine} />
              <ScoreLine label="Vue" v={result.score.vue} />
              <ScoreLine label="Plage" v={result.score.plage} />
              <ScoreLine label="Équipements" v={result.score.equipements} />
              <ScoreLine label="Rénovation" v={result.score.renovation} />
              <ScoreLine label="Capacité" v={result.score.capacite} />
            </div>
          </div>
          <div className="bg-[color:var(--e-ink)] text-[color:var(--e-paper)] p-6 flex flex-col justify-center items-center text-center">
            <p className="e-label mb-3" style={{ color: "rgba(245,245,240,0.55)" }}>Score</p>
            <p className="text-[64px] leading-none" style={{ fontFamily: "var(--e-title)" }}>{result.score.total}</p>
            <p className="text-xs opacity-70 mt-1">sur 100</p>
          </div>
        </div>

        <div className="p-6 bg-[color:var(--e-section-a)] border border-[color:var(--e-line)] mb-10">
          <p className="e-label mb-3">Synthèse Azurkeys</p>
          <p className="e-italic text-lg leading-snug">
            {synthese(result)}
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <MiniKpi label="Revenu annuel estimé" value={formatEur(result.revenu_annuel_eur)} />
            <MiniKpi label="Potentiel optimisé" value={`${formatEur(result.revenu_annuel_optimise_eur)}  (+${result.uplift_pct}%)`} />
            <MiniKpi label="Prix haute / nuit" value={formatEur(result.price_haute_eur)} />
          </div>
        </div>

        <div className="flex-1" />

        <div className="pt-6 border-t border-[color:var(--e-line)]">
          <div className="grid grid-cols-3 gap-6 text-xs text-[color:var(--e-text)]">
            <div>
              <p className="e-label mb-2">Azurkeys Properties</p>
              <p>Conciergerie premium</p>
              <p>Saint-Raphaël · Côte d'Azur</p>
            </div>
            <div>
              <p className="e-label mb-2">Confidentialité</p>
              <p>Ce rapport est strictement destiné à {form.contact.nom || "son commanditaire"} et ne peut être diffusé sans accord écrit.</p>
            </div>
            <div>
              <p className="e-label mb-2">Méthodologie</p>
              <p>Moteur déterministe barème Azurkeys, {calibrationLabel(result.calibration).toLowerCase()}.</p>
            </div>
          </div>
        </div>

        <div className="e-footnote">
          <span>Score & synthèse</span>
          <span>06 / 06</span>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sous-composants et helpers d'affichage
// ─────────────────────────────────────────────────────────────
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[color:var(--e-line)] pb-2">
      <span className="e-label">{label}</span>
      <span className="text-sm text-[color:var(--e-ink)]">{value}</span>
    </div>
  );
}
function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border border-[color:var(--e-line)]">
      <p className="e-label mb-2">{label}</p>
      <p className="text-sm" style={{ fontFamily: "var(--e-title)" }}>{value}</p>
    </div>
  );
}
function RangeCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="p-5"
      style={{
        background: highlight ? "var(--e-ink)" : "transparent",
        color: highlight ? "var(--e-paper)" : "var(--e-ink)",
        border: "1px solid " + (highlight ? "var(--e-ink)" : "var(--e-line)"),
      }}>
      <p className="e-label mb-2" style={{ color: highlight ? "rgba(245,245,240,0.55)" : undefined }}>{label}</p>
      <p className="text-2xl" style={{ fontFamily: "var(--e-title)" }}>{value}</p>
    </div>
  );
}
function ScoreLine({ label, v }: { label: string; v: number }) {
  const sign = v > 0 ? "+" : "";
  return (
    <div className="flex justify-between border-b border-[color:var(--e-line)] py-1">
      <span className="e-label" style={{ letterSpacing: "0.18em" }}>{label}</span>
      <span style={{ fontFamily: "var(--e-title)" }}>{sign}{v}</span>
    </div>
  );
}
function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function viewLabel(v: string) {
  return v === "aucune" ? "Aucune" :
         v === "degagee" ? "Dégagée" :
         v === "mer_partielle" ? "Mer partielle" :
         v === "mer_totale" ? "Mer totale" : "Exceptionnelle";
}
function calibrationLabel(c: EstimationResult["calibration"]) {
  return c === "airdna_marche_ia" ? "AirDNA + analyse marché" :
         c === "airdna" ? "AirDNA" :
         c === "marche_ia" ? "Analyse marché" : "Modèle interne";
}
function autoAtouts(form: EstimationFormData): string {
  const bits: string[] = [];
  if (form.exterieur.vue === "mer_totale" || form.exterieur.vue === "exceptionnelle") bits.push("vue mer exceptionnelle");
  if (form.exterieur.piscine === "privee") bits.push("piscine privée");
  if ((form.localisation.distance_plage_m ?? 9999) <= 500) bits.push("proximité immédiate de la plage");
  if (form.equipement.standing === "luxe" || form.equipement.standing === "premium") bits.push("prestations soignées");
  return bits.length ? "Le bien tire ses atouts de " + bits.join(", ") + "." : "Bien standard sans singularité marquée — potentiel de repositionnement.";
}
function autoFaiblesses(form: EstimationFormData): string {
  const bits: string[] = [];
  if (!form.equipement.clim) bits.push("absence de climatisation");
  if (form.equipement.qualite_photos === "amateur") bits.push("qualité photo à retravailler");
  if (form.equipement.standing === "basique") bits.push("standing à revoir");
  if ((form.localisation.distance_plage_m ?? 0) > 1000) bits.push("éloignement de la plage");
  return bits.length ? "Points à surveiller : " + bits.join(", ") + "." : "Aucun point bloquant identifié.";
}
function buildRecommendations(form: EstimationFormData, result: EstimationResult) {
  const list: { title: string; detail: string }[] = [];
  if (form.equipement.qualite_photos !== "professionnelle" && form.equipement.qualite_photos !== "editoriale") {
    list.push({ title: "Reportage photo professionnel", detail: "ROI mesurable dès la première saison : impact direct sur le taux de clic et l'ADR." });
  }
  if (!form.equipement.clim) {
    list.push({ title: "Installer la climatisation", detail: "Critère bloquant sur la Côte d'Azur en haute saison — perte de conversion estimée de 15 à 25 %." });
  }
  if (form.equipement.standing === "basique" || form.equipement.standing === "standard") {
    list.push({ title: "Home staging ciblé", detail: "Textiles, linge de maison, décoration éditoriale : gains typiques +8 à +12 % sur l'ADR." });
  }
  if (form.exterieur.type === "aucun") {
    list.push({ title: "Créer un espace extérieur", detail: "Même minimal (balcon aménagé) — critère décisif pour la clientèle premium." });
  }
  if ((form.localisation.distance_plage_m ?? 0) > 500 && form.exterieur.piscine === "aucune") {
    list.push({ title: "Envisager un accès piscine", detail: "Piscine collective ou partenariat spa — compense l'éloignement plage." });
  }
  list.push({ title: "Gestion dynamique du prix", detail: `Cible : ${formatEur(result.revenu_annuel_optimise_eur)} sur 12 mois (+${result.uplift_pct}%), sans dégrader l'expérience.` });
  return list.slice(0, 6);
}
function synthese(result: EstimationResult): string {
  if (result.score.total >= 80)
    return "Bien à fort potentiel, positionné dans le haut du marché. Optimisations mineures, focus sur la stratégie tarifaire dynamique.";
  if (result.score.total >= 60)
    return "Bon potentiel, avec des axes d'amélioration ciblés (photos, équipements, mise en scène) permettant un gain significatif.";
  return "Potentiel réel mais actuellement sous-exploité. Une remise à niveau ciblée peut débloquer plusieurs milliers d'euros de revenus annuels supplémentaires.";
}

// MODULE — Estimation locative · onglet ANALYSE DU LOGEMENT (étape 3, §24 & §25)
// Écran interne : chaque information affiche sa valeur, sa source et sa confiance.
import { useMemo, useState } from "react";
import {
  AlertTriangle, Check, Loader2, Pencil, RotateCcw, Sparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  confidenceBand, compareToMarket, resolveFacts, buildPropertySummary,
  SOURCE_LABEL_FR, type AiAnalysisPayload, type ResolvedFact, type SourceKind,
} from "@/lib/estimation-locative/ai-analysis";

interface PhotoRow {
  id: string;
  file_name: string | null;
  category: string | null;
  storage_path: string;
  aesthetic_score?: number | null;
  technical_score?: number | null;
  importance_score?: number | null;
  quality_score?: number | null;
  selected_for_report?: boolean | null;
}

interface Props {
  analysis: AiAnalysisPayload | null;
  features: Record<string, unknown>;
  rdna: Record<string, unknown>;
  overrides: Record<string, unknown>;
  photos: PhotoRow[];
  status: string;
  error: string | null;
  analyzedAt: string | null;
  running: boolean;
  onAnalyze: () => void;
  onToggleSelection: (photoId: string, selected: boolean) => void;
  onOverrideFact: (key: string, value: unknown) => void;
  renderThumb: (photo: PhotoRow) => React.ReactNode;
}

const scoreTxt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}`);

export default function EstimationAnalysisTab({
  analysis, features, rdna, overrides, photos, status, error, analyzedAt, running,
  onAnalyze, onToggleSelection, onOverrideFact, renderThumb,
}: Props) {
  const facts = useMemo(
    () => resolveFacts({ features, ai: analysis, rdna, overrides: overrides as any }),
    [features, analysis, rdna, overrides],
  );
  const summary = useMemo(() => buildPropertySummary(analysis, facts), [analysis, facts]);
  const market = useMemo(
    () => compareToMarket(facts, (rdna as any)?.amenity_penetration),
    [facts, rdna],
  );
  const conflicts = facts.filter((f) => f.conflict);

  return (
    <div className="space-y-10 pt-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-light">Analyse du logement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {status === "running" ? "Analyse en cours…"
              : analyzedAt ? `Dernière analyse le ${new Date(analyzedAt).toLocaleString("fr-FR")}`
              : "Les photos et les données du dossier sont analysées pour en tirer des observations vérifiables."}
          </p>
        </div>
        <Button onClick={onAnalyze} disabled={running || photos.length === 0}>
          {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : analysis ? <RotateCcw className="h-4 w-4 mr-2" strokeWidth={1.5} />
            : <Sparkles className="h-4 w-4 mr-2" strokeWidth={1.5} />}
          {analysis ? "Relancer l'analyse" : "Lancer l'analyse"}
        </Button>
      </div>

      {photos.length === 0 && (
        <p className="text-sm text-muted-foreground border border-dashed p-5">
          Ajoute des photos dans l'onglet Photos pour pouvoir lancer l'analyse.
        </p>
      )}

      {error && (
        <div className="flex items-start gap-3 border-l-2 border-destructive pl-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
          <span>{error} — les données précédentes ont été conservées, tu peux relancer l'analyse.</span>
        </div>
      )}

      {!analysis ? null : (
        <>
          {status === "partial" && (
            <p className="text-sm border-l-2 border-foreground pl-3 py-1.5">
              Analyse partielle : {analysis.photos_analyzed} photo(s) analysée(s),
              {" "}{analysis.photos_failed} non analysée(s).
            </p>
          )}

          {/* Conflits (§19) */}
          {conflicts.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">
                Conflits de données
              </h3>
              <ul className="space-y-2 text-sm">
                {conflicts.map((f) => (
                  <li key={f.key} className="flex items-start gap-3 border-l-2 border-foreground pl-3 py-1.5">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                    <span>{f.conflict!.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Scores (§5, §7) */}
          <section className="space-y-5">
            <h3 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">
              Analyse du bien
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              <Score label="Standing" value={analysis.scores.STANDING_SCORE} />
              <Score label="État général" value={analysis.scores.PROPERTY_CONDITION_SCORE} />
              <Score label="Design" value={analysis.scores.DESIGN_SCORE} />
              <Score label="Équipements" value={analysis.scores.EQUIPMENT_QUALITY_SCORE} />
              <Score label="Attractivité" value={analysis.scores.VISUAL_APPEAL_SCORE} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-2">
              <Score label="Qualité des photos" value={analysis.scores.PHOTO_QUALITY_SCORE} small />
              <Score label="Couverture du logement" value={analysis.scores.PHOTO_COVERAGE_SCORE} small />
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Positionnement</p>
                <p className="text-lg font-light mt-1">{analysis.positioning.label ?? "—"}</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Signal IA · confiance {confidenceBand(analysis.positioning.confidence)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Clientèle cible</p>
                <p className="text-lg font-light mt-1">{analysis.target.primary ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{analysis.target.secondary.join(" · ") || "—"}</p>
              </div>
            </div>
            {analysis.photo_quality.pieces_manquantes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Pièces non couvertes par les photos : {analysis.photo_quality.pieces_manquantes.join(", ")}.
              </p>
            )}
          </section>

          {/* Caractéristiques détectées (§25) */}
          <section className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">
              Caractéristiques retenues
            </h3>
            <ul className="divide-y">
              {facts.map((f) => (
                <FactRow key={f.key} fact={f} onOverride={onOverrideFact} />
              ))}
            </ul>
          </section>

          {/* Forces / faiblesses / USP / recommandations */}
          <div className="grid md:grid-cols-2 gap-10">
            <Block title="Forces" items={analysis.strengths} />
            <Block title="Faiblesses" items={analysis.weaknesses} />
            <Block title="USP" items={analysis.usp} />
            <Block title="Recommandations" items={analysis.recommendations} showPriority />
          </div>

          {/* Photos recommandées (§6) */}
          <section className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">
              Photos retenues pour le rapport
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {photos.map((p) => {
                const on = !!p.selected_for_report;
                return (
                  <div key={p.id} className="space-y-2">
                    <div className={`relative aspect-[4/3] overflow-hidden border ${on ? "border-foreground" : "opacity-60"}`}>
                      {renderThumb(p)}
                      <button
                        type="button"
                        onClick={() => onToggleSelection(p.id, !on)}
                        className="absolute top-2 right-2 bg-background border p-1"
                        aria-label={on ? "Retirer du rapport" : "Ajouter au rapport"}
                      >
                        {on ? <Check className="h-3.5 w-3.5" strokeWidth={1.5} /> : <X className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      </button>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {p.category ?? "Sans catégorie"} · note {scoreTxt(p.quality_score)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Détails internes */}
          <Accordion type="multiple" className="border-t">
            {market.length > 0 && (
              <AccordionItem value="marche">
                <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">
                  Comparaison au marché local
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="divide-y text-sm">
                    {market.map((m) => (
                      <li key={m.key} className="py-2.5 flex items-start justify-between gap-4">
                        <span>{m.message}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {m.verdict === "differenciant" ? "Différenciant"
                            : m.verdict === "manque" ? "Manque"
                            : m.verdict === "inconnu" ? "Inconnu" : "Standard"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="resume">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">
                Résumé interne du bien
              </AccordionTrigger>
              <AccordionContent>
                <dl className="space-y-3 text-sm">
                  <Row label="Positionnement" value={summary.positionnement} />
                  <Row label="Standing" value={summary.standing !== null ? `${summary.standing}/100` : null} />
                  <Row label="Potentiel locatif" value={summary.potentiel_locatif} />
                  <Row label="Points à améliorer" value={summary.points_a_ameliorer.join(" · ") || null} />
                  <Row label="Risques" value={summary.risques.join(" · ") || null} />
                  <Row label="Confiance globale" value={summary.confiance} />
                </dl>
              </AccordionContent>
            </AccordionItem>

            {analysis.errors.length > 0 && (
              <AccordionItem value="erreurs">
                <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">
                  Incidents pendant l'analyse ({analysis.errors.length})
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-sm space-y-2">
                    {analysis.errors.map((e, i) => <li key={i} className="text-muted-foreground">{e}</li>)}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </>
      )}
    </div>
  );
}

function Score({ label, value, small }: { label: string; value: number | null; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={small ? "text-lg font-light mt-1" : "text-3xl font-light mt-2"}>
        {value === null ? "—" : value}
        {value !== null && <span className="text-sm text-muted-foreground">/100</span>}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value ?? "—"}</dd>
    </div>
  );
}

function Block({
  title, items, showPriority,
}: { title: string; items: { label: string; rationale?: string | null; priority?: string; impact?: string | null }[]; showPriority?: boolean }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Rien d'établi à partir des données disponibles.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {items.map((it, i) => (
            <li key={i}>
              <div className="flex items-center gap-2">
                <span>{it.label}</span>
                {showPriority && it.priority && (
                  <Badge variant="outline" className="text-[10px]">{it.priority}</Badge>
                )}
              </div>
              {(it.rationale || it.impact) && (
                <p className="text-xs text-muted-foreground mt-0.5">{it.rationale ?? it.impact}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const STATUS_LABEL: Record<string, string> = {
  present: "Observé",
  absent: "Absent",
  not_observable: "Non observable",
  unknown: "Inconnu",
};

function FactRow({ fact, onOverride }: { fact: ResolvedFact; onOverride: (k: string, v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const overridden = fact.source === "MANUAL";

  return (
    <li className="py-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm">{fact.label}</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {STATUS_LABEL[fact.status]} · source {SOURCE_LABEL_FR[fact.source as SourceKind]}
          {fact.confidence !== null && ` · confiance ${Math.round(fact.confidence * 100)} %`}
        </p>
        {fact.rationale && fact.source === "AI" && (
          <p className="text-xs text-muted-foreground mt-0.5">{fact.rationale}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus value={draft} className="h-9 w-40"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onOverride(fact.key, draft.trim() || null); setEditing(false); }
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button className="p-1.5" onClick={() => { onOverride(fact.key, draft.trim() || null); setEditing(false); }} aria-label="Valider">
              <Check className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="group flex items-center gap-2 text-sm"
              onClick={() => { setDraft(String(fact.value ?? "")); setEditing(true); }}
            >
              {fact.value === null ? <span className="text-muted-foreground">Non renseigné</span> : String(fact.value)}
              <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60" strokeWidth={1.5} />
            </button>
            {overridden && (
              <button className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground underline"
                onClick={() => onOverride(fact.key, null)}>
                rétablir
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

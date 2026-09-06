// MODULE — Estimation locative · écran INTERNE de calcul et de validation (§24 & §27)
// Tout ce qui est affiché ici est interne : confiance, alertes, coefficients,
// comparables, prix du ménage. Rien de tout cela n'ira dans le rapport propriétaire.
import { useMemo, useState } from "react";
import {
  AlertTriangle, Calculator, Check, Info, Loader2, Pencil, RotateCcw, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import type { EngineOutput, SeasonKey } from "@/lib/estimation-locative/engine-types";
import { applyOverrides, type ManualOverrides } from "@/lib/estimation-locative/engine";

const eur = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${Math.round(v).toLocaleString("fr-FR")} €`;
const percent = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${Math.round(v)} %`;

interface Props {
  raw: EngineOutput | null;
  overrides: ManualOverrides;
  computing: boolean;
  onCompute: () => void;
  onOverride: (key: string, value: number | null, computed: number | null) => void;
}

export default function EstimationEngineTab({ raw, overrides, computing, onCompute, onOverride }: Props) {
  const out = useMemo(() => (raw ? applyOverrides(raw, overrides) : null), [raw, overrides]);

  if (!out) {
    return (
      <div className="space-y-6 pt-8">
        <div className="border border-dashed p-10 text-center space-y-4">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Le moteur croise le rapport RDNA, les logements comparables, l'analyse des photos
            et les caractéristiques du bien pour proposer un prix par saison, une occupation
            et un chiffre d'affaires annuel. Rien n'est inventé : ce qui manque reste inconnu.
          </p>
          <Button onClick={onCompute} disabled={computing}>
            {computing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" strokeWidth={1.5} />}
            Lancer le calcul
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Moteur v{out.version} · calculé le {new Date(out.computed_at).toLocaleString("fr-FR")}
        </div>
        <Button variant="outline" onClick={onCompute} disabled={computing}>
          {computing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" strokeWidth={1.5} />}
          Recalculer
        </Button>
      </div>

      {/* Alertes internes */}
      {out.alerts.length > 0 && (
        <ul className="space-y-2">
          {out.alerts.map((a, i) => (
            <li key={i} className={`flex items-start gap-3 border-l-2 pl-3 py-1.5 text-sm ${
              a.level === "critical" ? "border-destructive text-destructive"
                : a.level === "warning" ? "border-foreground" : "border-border text-muted-foreground"
            }`}>
              {a.level === "critical" ? <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                : a.level === "warning" ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
                : <Info className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />}
              <span>{a.message}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Saisons */}
      <section className="space-y-5">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">
          Prix par saison
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {(["basse", "moyenne", "haute"] as SeasonKey[]).map((k) => {
            const s = out.seasons[k];
            const rawSeason = raw!.seasons[k];
            return (
              <div key={k} className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{s.label}</p>
                <EditableValue
                  display={eur(s.price_recommended)}
                  big
                  overridden={!!overrides[`${k}.price_recommended`]}
                  computed={rawSeason.price_recommended}
                  onSave={(v) => onOverride(`${k}.price_recommended`, v, rawSeason.price_recommended)}
                />
                <p className="text-sm text-muted-foreground">
                  Fourchette {eur(s.price_min)} — {eur(s.price_max)}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">Occupation</span>
                  <EditableValue
                    display={percent(s.occupancy_pct)}
                    overridden={!!overrides[`${k}.occupancy_pct`]}
                    computed={rawSeason.occupancy_pct}
                    onSave={(v) => onOverride(`${k}.occupancy_pct`, v, rawSeason.occupancy_pct)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.nights_sellable} nuits commercialisables · revenu {eur(s.revenue)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Synthèse annuelle */}
      <section className="space-y-5">
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground border-b pb-2">
          Année complète
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <Kpi label="Chiffre d'affaires" value={eur(out.annual.revenue)} />
          <Kpi label="Occupation annuelle" value={percent(out.annual.occupancy_pct)} />
          <Kpi label="Prix moyen pondéré" value={eur(out.annual.adr_weighted)} />
          <Kpi label="Nuits commercialisables" value={String(out.annual.nights_sellable)} />
        </div>
        {out.annual.breakdown.length > 0 && (
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b">
                <th className="py-2">Période</th><th>Nuits</th><th>Occupation</th><th>Prix</th><th className="text-right">Revenu</th>
              </tr>
            </thead>
            <tbody>
              {out.annual.breakdown.map((b) => (
                <tr key={b.label} className="border-b">
                  <td className="py-2">{b.label}</td>
                  <td>{b.nights}</td>
                  <td>{percent(b.occupancy_pct)}</td>
                  <td>{eur(b.adr)}</td>
                  <td className="text-right">{eur(b.revenue)}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td className="py-2">Total</td>
                <td>{out.annual.nights_booked ?? "—"} réservées</td>
                <td>{percent(out.annual.occupancy_pct)}</td>
                <td>{eur(out.annual.adr_weighted)}</td>
                <td className="text-right">{eur(out.annual.revenue)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      {/* Détail du raisonnement */}
      <Accordion type="multiple" className="border-t">
        <AccordionItem value="trace">
          <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">Détail du calcul</AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-4 text-sm">
              {out.trace.map((t, i) => (
                <li key={i} className="border-l-2 pl-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t.step}</p>
                  <p className="mt-1">{t.detail}</p>
                </li>
              ))}
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="marche">
          <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">Marché de référence</AccordionTrigger>
          <AccordionContent>
            <div className="grid sm:grid-cols-3 gap-6 text-sm">
              <Kpi label="Prix marché RDNA" value={eur(out.market.rdna_adr)} small />
              <Kpi label="Prix marché comparables" value={eur(out.market.comparables_adr)} small />
              <Kpi label="Baseline retenue" value={eur(out.market.baseline_adr.value)} small />
              <Kpi label="Occupation RDNA" value={out.market.rdna_occupancy !== null ? percent(out.market.rdna_occupancy * 100) : "—"} small />
              <Kpi label="Positionnement" value={out.positioning?.label ?? "—"} small />
              <Kpi label="Cohérence des sources" value={out.coherence.verdict} small />
            </div>
            {Object.keys(out.market.penetration).length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Taux d'équipement du marché local
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(out.market.penetration).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[10px]">{k} · {Math.round(v * 100)} %</Badge>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ajustements">
          <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">Atouts et pénalités retenus</AccordionTrigger>
          <AccordionContent>
            {out.adjustments.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun facteur différenciant identifié.</p>
            ) : (
              <ul className="divide-y text-sm">
                {out.adjustments.items.map((a) => (
                  <li key={a.key + a.label} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p>{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.rationale}</p>
                    </div>
                    <span className="font-mono text-sm shrink-0">
                      {a.applied_pct > 0 ? "+" : ""}{a.applied_pct} %
                    </span>
                  </li>
                ))}
                <li className="py-3 flex justify-between font-medium">
                  <span>Effet net</span>
                  <span className="font-mono">{out.adjustments.total_pct > 0 ? "+" : ""}{out.adjustments.total_pct} %</span>
                </li>
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="comparables">
          <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">
            Comparables utilisés ({out.comparables.filter((c) => c.used).length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-b">
                    <th className="py-2">Logement</th><th>Similarité</th><th>Poids</th><th>Prix affiché</th><th>Occupation</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {out.comparables.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 pr-3">{c.name ?? "—"}</td>
                      <td>{c.score}/100</td>
                      <td>{c.used ? c.weight : "—"}</td>
                      <td>{eur(c.adr)}</td>
                      <td>{c.occupancy !== null ? percent(c.occupancy * 100) : "—"}</td>
                      <td className="text-xs text-muted-foreground">
                        {c.outlier ? "Écarté (aberrant)" : c.used ? "Retenu" : "Trop différent"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="confiance">
          <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">
            Confiance interne — {out.confidence.score}/100
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground mb-4">
              Indicateur strictement interne : il n'apparaîtra jamais dans le rapport propriétaire.
            </p>
            <ul className="divide-y text-sm">
              {out.confidence.factors.map((f) => (
                <li key={f.key} className="py-2.5 flex items-center justify-between gap-4">
                  <span>{f.label}</span>
                  <span className="text-right">
                    <span className="font-mono">{f.points}/{f.max}</span>
                    <span className="block text-xs text-muted-foreground">{f.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {out.unknowns.length > 0 && (
          <AccordionItem value="unknown">
            <AccordionTrigger className="text-[10px] uppercase tracking-[0.24em]">
              Données inconnues ({out.unknowns.length})
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Ces éléments n'ont pas pu être établis à partir des données disponibles et n'ont
                pas été remplacés par une valeur arbitraire : {out.unknowns.join(", ")}.
              </p>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

function Kpi({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className={small ? "text-lg font-light mt-1" : "text-3xl font-light mt-2"}>{value}</p>
    </div>
  );
}

function EditableValue({
  display, computed, overridden, big, onSave,
}: {
  display: string;
  computed: number | null;
  overridden: boolean;
  big?: boolean;
  onSave: (v: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus inputMode="decimal" value={draft} className="h-9 w-28"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onSave(draft.trim() === "" ? null : Number(draft)); setEditing(false); }
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          className="p-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => { onSave(draft.trim() === "" ? null : Number(draft)); setEditing(false); }}
          aria-label="Valider"
        >
          <Check className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => { setDraft(""); setEditing(true); }}
        className={`group flex items-center gap-2 ${big ? "text-4xl font-light" : "text-base"}`}
      >
        {display}
        <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60" strokeWidth={1.5} />
      </button>
      {overridden && (
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Corrigé à la main · valeur calculée {computed === null ? "—" : Math.round(computed)}
          <button className="ml-2 underline" onClick={() => onSave(null)}>rétablir</button>
        </p>
      )}
    </div>
  );
}

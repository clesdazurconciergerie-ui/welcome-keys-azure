// MODULE — Estimation locative · ÉTAPE 4 : marché & comparables (écran INTERNE)
// Tout ce qui est affiché ici est destiné au conseiller : scores de similarité,
// sources, écarts RDNA/web, prix du ménage. Rien n'est inventé : une donnée
// absente s'affiche « Inconnu » et n'est jamais remplacée par une moyenne.
import { useMemo, useState } from "react";
import {
  AlertTriangle, ExternalLink, FileText, Globe, Loader2, MapPin, Plus, Search, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DISPLAYED_PRICE_DISCLAIMER, POOL_LABELS, VIEW_LABELS, formatDistance,
  type ScoredMarketComparable,
} from "@/lib/estimation-locative/market-research";

const UNKNOWN = "Inconnu";
const eur = (v: number | null | undefined) =>
  v === null || v === undefined ? UNKNOWN : `${Math.round(v).toLocaleString("fr-FR")} €`;
const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? UNKNOWN : `${Math.round(v)} %`;
const dateFr = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("fr-FR") : UNKNOWN;

interface Props {
  view: any | null;
  localContext: any;
  localEvents: any[];
  researchStatus: string | null;
  researchError: string | null;
  researchedAt: string | null;
  researching: boolean;
  onResearch: () => void;
  onImportRdna: () => void;
  importingRdna: boolean;
  rdnaData: Record<string, any>;
  documents: { id: string; file_name: string; status: string }[];
  onUpdateComparable: (id: string, patch: Record<string, any>) => void;
  onDeleteComparable: (id: string) => void;
  onAddComparable: (patch: Record<string, any>) => void;
}

export default function EstimationMarketTab({
  view, localContext, localEvents, researchStatus, researchError, researchedAt,
  researching, onResearch, onImportRdna, importingRdna, rdnaData, documents,
  onUpdateComparable, onDeleteComparable, onAddComparable,
}: Props) {
  const [origin, setOrigin] = useState<"tous" | "rdna" | "web" | "manual">("tous");
  const [onlyPrimary, setOnlyPrimary] = useState(false);

  const rows: ScoredMarketComparable[] = useMemo(() => {
    const all: ScoredMarketComparable[] = view?.scored ?? [];
    return all.filter((s) => {
      if (onlyPrimary && !s.selected) return false;
      if (origin === "tous") return true;
      return s.comparable.origin === origin;
    });
  }, [view, origin, onlyPrimary]);

  const snapshot = view?.snapshot;
  const quality = view?.quality;
  const contrast = view?.contrast;

  return (
    <div className="space-y-10 pt-8">
      {/* ── Sources ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onResearch} disabled={researching}>
          {researching
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <Search className="h-4 w-4 mr-2" strokeWidth={1.5} />}
          Rechercher les comparables en ligne
        </Button>
        <Button variant="outline" onClick={onImportRdna} disabled={importingRdna}>
          {importingRdna
            ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            : <FileText className="h-4 w-4 mr-2" strokeWidth={1.5} />}
          Importer un PDF AirDNA / RDNA
        </Button>
        <ManualComparableDialog onAdd={onAddComparable} />
        <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Dernière recherche : {dateFr(researchedAt)}
        </span>
      </div>

      {researchError && (
        <p className="text-sm border-l-2 border-foreground pl-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
          {researchError}
        </p>
      )}
      {researchStatus === "running" && (
        <p className="text-sm text-muted-foreground">Recherche en cours…</p>
      )}

      {documents.length > 0 && (
        <ul className="text-sm divide-y border-t">
          {documents.map((d) => (
            <li key={d.id} className="py-3 flex items-center justify-between gap-3">
              <span className="truncate">{d.file_name}</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">{d.status}</Badge>
            </li>
          ))}
        </ul>
      )}

      {/* ── Instantané du marché ───────────────────────────────────── */}
      {snapshot && (
        <section className="space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Instantané du marché local
          </h3>
          <div className="grid sm:grid-cols-4 gap-6">
            <Stat label="Analysés" value={String(snapshot.analyzed)} />
            <Stat label="Retenus" value={String(snapshot.selected)} />
            <Stat label="RDNA / Web" value={`${snapshot.rdna_count} / ${snapshot.web_count}`} />
            <Stat label="Qualité des données" value={quality ? `${quality.score}/100` : UNKNOWN} />
            <Stat
              label="Prix affichés (min / médiane / max)"
              value={snapshot.displayed_price.sample
                ? `${eur(snapshot.displayed_price.min)} · ${eur(snapshot.displayed_price.median)} · ${eur(snapshot.displayed_price.max)}`
                : UNKNOWN}
            />
            <Stat
              label="ADR RDNA (min / médiane / max)"
              value={snapshot.rdna_adr.sample
                ? `${eur(snapshot.rdna_adr.min)} · ${eur(snapshot.rdna_adr.median)} · ${eur(snapshot.rdna_adr.max)}`
                : UNKNOWN}
            />
            <Stat
              label="Profil dominant"
              value={[
                snapshot.dominant.property_type ?? null,
                snapshot.dominant.bedrooms !== null ? `${snapshot.dominant.bedrooms} ch.` : null,
                snapshot.dominant.capacity !== null ? `${snapshot.dominant.capacity} pers.` : null,
              ].filter(Boolean).join(" · ") || UNKNOWN}
            />
            <Stat
              label="Observations"
              value={`${dateFr(snapshot.oldest_observation)} → ${dateFr(snapshot.newest_observation)}`}
            />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-3">
              Équipements du marché
            </p>
            <div className="grid sm:grid-cols-3 gap-x-8 gap-y-2 text-sm">
              {snapshot.amenities.map((a: any) => (
                <div key={a.key} className="flex justify-between border-b py-1">
                  <span>{a.label}</span>
                  <span className="font-mono text-xs">
                    {a.penetration === null ? "Échantillon insuffisant" : `${a.penetration} %`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {contrast && (
            <p className="text-sm text-muted-foreground border-l-2 pl-3">{contrast.message}</p>
          )}
          <p className="text-xs text-muted-foreground border-l-2 pl-3">{DISPLAYED_PRICE_DISCLAIMER}</p>
          {quality?.notes?.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1">
              {quality.notes.map((n: string, i: number) => <li key={i}>• {n}</li>)}
            </ul>
          )}
        </section>
      )}

      {view && !view.sufficient && view.message && (
        <p className="text-sm border-l-2 border-foreground pl-3">{view.message}</p>
      )}

      {/* ── Données RDNA ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Données RDNA extraites</h3>
        {Object.keys(rdnaData ?? {}).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée importée.</p>
        ) : (
          <dl className="grid sm:grid-cols-3 gap-4 text-sm">
            <Stat label="Market score" value={rdnaData.market_score ?? UNKNOWN} />
            <Stat label="ADR" value={eur(rdnaData.adr_eur)} />
            <Stat label="Occupation" value={pct(rdnaData.occupation_pct)} />
            <Stat label="Revenu annuel" value={eur(rdnaData.revenu_annuel_eur)} />
            <Stat label="Chambres" value={rdnaData.chambres ?? UNKNOWN} />
            <Stat label="Voyageurs" value={rdnaData.voyageurs ?? UNKNOWN} />
          </dl>
        )}
      </section>

      {/* ── Comparables ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Comparables ({rows.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {(["tous", "rdna", "web", "manual"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOrigin(o)}
                className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1 border transition-colors ${
                  origin === o ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {o === "tous" ? "Tous" : o === "manual" ? "Manuels" : o.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => setOnlyPrimary((v) => !v)}
              className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1 border transition-colors ${
                onlyPrimary ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              Retenus
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun comparable pour l'instant.</p>
        ) : (
          <Accordion type="multiple" className="border-t">
            {rows.map((s) => {
              const c = s.comparable;
              return (
                <AccordionItem key={c.id} value={c.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex-1 flex flex-wrap items-center gap-3 text-left pr-3">
                      <span className="font-mono text-xs w-12 shrink-0">{s.score}/100</span>
                      <span className="flex-1 min-w-[8rem] truncate">{c.name ?? c.url ?? UNKNOWN}</span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-[0.18em]">
                        {c.origin === "rdna" ? "RDNA" : c.origin === "manual" ? "Manuel" : (c.platform ?? "Web")}
                      </Badge>
                      {s.selected && (
                        <Badge className="text-[10px] uppercase tracking-[0.18em]">Retenu</Badge>
                      )}
                      <span className="font-mono text-xs">{eur(c.displayed_price)}</span>
                      <span className="text-xs text-muted-foreground">{formatDistance(c.distance_m)}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 pb-6">
                    <p className="text-xs text-muted-foreground">{s.reason}</p>

                    <div className="grid sm:grid-cols-4 gap-4 text-sm">
                      <Stat label="Type" value={c.property_type ?? UNKNOWN} />
                      <Stat label="Chambres" value={c.bedrooms ?? UNKNOWN} />
                      <Stat label="Voyageurs" value={c.capacity ?? UNKNOWN} />
                      <Stat label="Surface" value={c.surface_m2 ? `${c.surface_m2} m²` : UNKNOWN} />
                      <Stat label="Piscine" value={POOL_LABELS[c.pool_kind]} />
                      <Stat label="Vue" value={VIEW_LABELS[c.view_kind]} />
                      <Stat label="Ménage" value={eur(c.cleaning_fee)} />
                      <Stat label="Total séjour" value={eur(c.total_stay_price)} />
                      <Stat label="Occupation" value={pct(c.occupancy_pct)} />
                      <Stat label="Revenu réel" value={eur(c.actual_revenue)} />
                      <Stat label="Note" value={c.rating ?? UNKNOWN} />
                      <Stat label="Observé le" value={dateFr(c.observed_at)} />
                    </div>

                    {s.missing.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Données inconnues : {s.missing.join(", ")}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      {s.axes.filter((a) => a.score !== null).map((a) => (
                        <span key={a.key}>{a.label} {Math.round((a.score as number) * 100)} %</span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {c.url && (
                        <a
                          href={c.url} target="_blank" rel="noreferrer"
                          className="text-xs underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" strokeWidth={1.5} /> Voir l'annonce
                        </a>
                      )}
                      <div className="flex-1" />
                      <Button
                        variant="outline" size="sm"
                        onClick={() => onUpdateComparable(c.id, { kept_manually: !c.kept_manually })}
                      >
                        {c.kept_manually ? "Ne plus forcer" : "Conserver quand même"}
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => onUpdateComparable(c.id, { not_relevant: !c.not_relevant })}
                      >
                        {c.not_relevant ? "Réintégrer" : "Non pertinent"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDeleteComparable(c.id)}>
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </section>

      {/* ── Contexte local ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Contexte local</h3>
        {(localContext?.pois ?? []).length === 0 && (localContext?.nuisances ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun élément relevé.</p>
        ) : (
          <>
            <ul className="text-sm divide-y border-t">
              {(localContext?.pois ?? []).map((p: any, i: number) => (
                <li key={i} className="py-2 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                    {p.name} <span className="text-muted-foreground text-xs">{p.category}</span>
                  </span>
                  <span className="font-mono text-xs">{formatDistance(p.distance_m)}</span>
                </li>
              ))}
            </ul>
            {(localContext?.nuisances ?? []).map((n: any, i: number) => (
              <p key={i} className="text-sm text-muted-foreground border-l-2 pl-3">{n.message}</p>
            ))}
          </>
        )}
      </section>

      {/* ── Événements locaux ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Événements locaux</h3>
        {(localEvents ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement identifié.</p>
        ) : (
          <ul className="text-sm divide-y border-t">
            {localEvents.map((e: any, i: number) => (
              <li key={i} className="py-2 flex items-center justify-between gap-3">
                <span>{e.name}{e.location ? ` · ${e.location}` : ""}</span>
                <span className="font-mono text-xs">{e.date ?? UNKNOWN}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(localContext?.sources ?? []).length > 0 && (
        <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground flex items-center gap-2">
          <Globe className="h-3 w-3" strokeWidth={1.5} />
          Sources : {localContext.sources.join(", ")} · {localContext.scraped ?? 0} page(s) lue(s)
          sur {localContext.searched ?? 0} résultat(s)
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

/** §29 — ajout manuel : seules les valeurs réellement saisies sont enregistrées. */
function ManualComparableDialog({ onAdd }: { onAdd: (patch: Record<string, any>) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k: string) => (form[k]?.trim() ? Number(form[k]) : null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} /> Ajouter un comparable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Comparable ajouté manuellement</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["name", "Nom / annonce", "text"], ["url", "Lien", "text"],
            ["platform", "Plateforme", "text"], ["property_type", "Type", "text"],
            ["bedrooms", "Chambres", "number"], ["capacity", "Voyageurs", "number"],
            ["displayed_price", "Prix affiché / nuit (€)", "number"],
            ["cleaning_fee", "Frais de ménage (€)", "number"],
            ["distance_m", "Distance (m)", "number"],
          ].map(([k, label, type]) => (
            <div key={k} className="space-y-1">
              <Label className="text-[10px] uppercase tracking-[0.2em]">{label}</Label>
              <Input type={type} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Laisse vide ce que tu ne connais pas : une donnée absente reste inconnue.
        </p>
        <DialogFooter>
          <Button
            onClick={() => {
              onAdd({
                name: form.name?.trim() || null,
                url: form.url?.trim() || null,
                platform: form.platform?.trim() || null,
                property_type: form.property_type?.trim() || null,
                bedrooms: num("bedrooms"), capacity: num("capacity"),
                displayed_price: num("displayed_price"),
                cleaning_fee: num("cleaning_fee"), distance_m: num("distance_m"),
              });
              setForm({}); setOpen(false);
            }}
          >
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

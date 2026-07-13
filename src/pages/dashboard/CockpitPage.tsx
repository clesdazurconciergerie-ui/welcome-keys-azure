import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Upload, Loader2, X, Network, List } from "lucide-react";
import { parseMarkdownProjets } from "@/lib/cockpit-markdown-parser";
import { cn } from "@/lib/utils";
import CockpitGraph, { type GraphProjet, type GraphPole } from "@/components/cockpit/CockpitGraph";
import ProjetSidePanel from "@/components/cockpit/ProjetSidePanel";

type Pole = { id: string; numero: number; nom: string; objectif: string | null };
type Projet = {
  id: string; pole_id: string; nom: string; objectif: string | null;
  actions: any; automatisations: any; kpis: any;
  priorite: "P1" | "P2" | "P3" | "P4";
  difficulte: number; impact: number;
  statut: "a_faire" | "en_cours" | "fait" | "abandonne";
  resultat: string | null; date_validation: string | null;
  recommande?: boolean;
};
type Action = {
  id: string; projet_id: string; ordre: number;
  texte: string; fait: boolean; date: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  a_faire: "À faire", en_cours: "En cours", fait: "Fait", abandonne: "Abandonné",
};

// Puce ronde reflétant l'état d'avancement des actions
function ProjetBullet({ done, total, statut }: { done: number; total: number; statut: string }) {
  const isDone = statut === "fait";
  const isAbandon = statut === "abandonne";
  const pct = total > 0 ? done / total : (statut === "en_cours" ? 0.5 : 0);
  let fill = "none";
  let stroke = "hsl(var(--muted-foreground))";
  if (isDone) { fill = "hsl(142 71% 45%)"; stroke = "hsl(142 71% 45%)"; }
  else if (isAbandon) { stroke = "hsl(var(--muted-foreground))"; }
  else if (pct >= 1) { fill = "hsl(142 71% 45%)"; stroke = "hsl(142 71% 45%)"; }

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke={stroke} strokeWidth="1.2" />
      {isDone || pct >= 1 ? (
        <circle cx="6" cy="6" r="3" fill={fill} />
      ) : pct > 0 ? (
        <path d="M6,1.5 A4.5,4.5 0 0,1 6,10.5 Z" fill={stroke} opacity="0.6" />
      ) : null}
    </svg>
  );
}

export default function CockpitPage() {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [expPoles, setExpPoles] = useState<Record<string, boolean>>({});
  const [expProjets, setExpProjets] = useState<Record<string, boolean>>({});
  const [filterPriorite, setFilterPriorite] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [ideeOpen, setIdeeOpen] = useState(false);
  const [iaResult, setIaResult] = useState<any>(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaAnswers, setIaAnswers] = useState<string[]>([]);
  const [iaProjetId, setIaProjetId] = useState<string | null>(null);
  const [vue, setVue] = useState<"graph" | "list">("graph");
  const [selectedProjetId, setSelectedProjetId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: pr }, { data: a }] = await Promise.all([
      supabase.from("poles" as any).select("*").order("numero"),
      supabase.from("projets" as any).select("*").order("created_at"),
      supabase.from("actions" as any).select("*").order("ordre"),
    ]);
    setPoles((p as any) || []);
    setProjets((pr as any) || []);
    setActions((a as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const actionsByProjet = useMemo(() => {
    const m = new Map<string, Action[]>();
    for (const a of actions) {
      if (!m.has(a.projet_id)) m.set(a.projet_id, []);
      m.get(a.projet_id)!.push(a);
    }
    return m;
  }, [actions]);

  const graphProjets = useMemo<GraphProjet[]>(() => projets.map(pr => {
    const list = actionsByProjet.get(pr.id) || [];
    return {
      id: pr.id, pole_id: pr.pole_id, nom: pr.nom,
      statut: pr.statut, priorite: pr.priorite,
      recommande: !!pr.recommande,
      done: list.filter(a => a.fait).length,
      total: list.length,
    };
  }), [projets, actionsByProjet]);

  const graphPoles = useMemo<GraphPole[]>(() =>
    poles.map(p => ({ id: p.id, numero: p.numero, nom: p.nom })), [poles]);

  const enCours = useMemo(() => projets.filter(p => p.statut === "en_cours").slice(0, 3), [projets]);
  const selectedProjet = useMemo(() => projets.find(p => p.id === selectedProjetId) || null, [projets, selectedProjetId]);

  const filtered = useMemo(() => projets.filter(pr => {
    if (filterPriorite !== "all" && pr.priorite !== filterPriorite) return false;
    if (filterStatut !== "all" && pr.statut !== filterStatut) return false;
    return true;
  }), [projets, filterPriorite, filterStatut]);

  const toggleAction = async (a: Action) => {
    const nowDone = !a.fait;
    const { error } = await supabase.from("actions" as any).update({
      fait: nowDone, date: nowDone ? new Date().toISOString() : null,
    }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    // update local
    const nextActions = actions.map(x => x.id === a.id ? { ...x, fait: nowDone, date: nowDone ? new Date().toISOString() : null } : x);
    setActions(nextActions);

    // Check completion → auto validate
    const projetActions = nextActions.filter(x => x.projet_id === a.projet_id);
    const allDone = projetActions.length > 0 && projetActions.every(x => x.fait);
    const projet = projets.find(p => p.id === a.projet_id);
    if (!projet) return;

    if (allDone && projet.statut !== "fait") {
      const resultat = `Toutes les actions cochées (${projetActions.length}/${projetActions.length})`;
      const { error: e2 } = await supabase.from("projets" as any).update({
        statut: "fait", resultat, date_validation: new Date().toISOString(),
      }).eq("id", projet.id);
      if (e2) toast.error(e2.message);
      else {
        toast.success("Projet complété !");
        await load();
        await callIA(projet.id);
      }
    } else if (!allDone && projet.statut === "a_faire" && projetActions.some(x => x.fait)) {
      // Passe en cours dès qu'une case est cochée
      await supabase.from("projets" as any).update({ statut: "en_cours" }).eq("id", projet.id);
      setProjets(projets.map(p => p.id === projet.id ? { ...p, statut: "en_cours" } : p));
    }
  };

  const addAction = async (projetId: string, texte: string) => {
    if (!texte.trim()) return;
    const existing = actionsByProjet.get(projetId) || [];
    const ordre = existing.length;
    const { error } = await supabase.from("actions" as any).insert({
      projet_id: projetId, ordre, texte: texte.trim(),
    });
    if (error) toast.error(error.message); else load();
  };

  const deleteAction = async (id: string) => {
    const { error } = await supabase.from("actions" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else setActions(actions.filter(a => a.id !== id));
  };

  const changeStatut = async (pr: Projet, statut: Projet["statut"]) => {
    if (statut === "en_cours" && pr.statut !== "en_cours") {
      const active = projets.filter(p => p.statut === "en_cours" && p.id !== pr.id).length;
      if (active >= 3) {
        toast.error("Max 3 projets actifs — termine ou abandonne d'abord");
        return;
      }
    }
    const { error } = await supabase.from("projets" as any).update({ statut }).eq("id", pr.id);
    if (error) toast.error(error.message);
    else load();
  };

  const callIA = async (projet_valide_id: string, reponses_questions?: string[]) => {
    setIaLoading(true);
    setIaResult(null);
    setIaProjetId(projet_valide_id);
    try {
      const { data, error } = await supabase.functions.invoke("cockpit-ia-suggest", {
        body: { projet_valide_id, reponses_questions },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setIaResult(data);
      await supabase.from("suggestions_ia" as any).insert({
        projet_id: projet_valide_id, contenu: data, acceptee: false,
      });
      if (data.questions?.length) setIaAnswers(data.questions.map(() => ""));
    } catch (e: any) {
      toast.error(e.message || "L'IA n'a pas pu analyser, réessayez");
      setIaResult(null);
    } finally {
      setIaLoading(false);
    }
  };

  const acceptSuggestion = async (s: any) => {
    const projet = projets.find(p => p.id === s.projet_id);
    if (!projet) return;
    const { error } = await supabase.from("projets" as any).update({
      priorite: "P1",
      statut: projet.statut === "fait" ? "a_faire" : projet.statut,
      recommande: true,
    }).eq("id", s.projet_id);
    if (error) toast.error(error.message);
    else { toast.success("Projet priorisé"); load(); }
  };

  const acceptAllSuggestions = async () => {
    if (!iaResult?.suggestions?.length) return;
    const ids = iaResult.suggestions.map((s: any) => s.projet_id);
    // Reset previous recommandations
    await supabase.from("projets" as any).update({ recommande: false }).eq("recommande", true);
    // Flag new ones
    await supabase.from("projets" as any).update({ recommande: true }).in("id", ids);
    // Also apply priority P1 + unfaire les fait
    for (const s of iaResult.suggestions) await acceptSuggestion(s);
    toast.success("Suggestions IA appliquées");
    load();
  };

  const acceptRepriorisation = async (r: any) => {
    const { error } = await supabase.from("projets" as any).update({
      priorite: r.nouvelle_priorite,
    }).eq("id", r.projet_id);
    if (error) toast.error(error.message);
    else { toast.success("Priorité mise à jour"); load(); }
  };

  const submitAnswers = async () => {
    if (!iaProjetId) return;
    await callIA(iaProjetId, iaAnswers);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Cockpit Stratégique</h1>
          <p className="text-sm text-muted-foreground mt-1">Ma roadmap vivante, re-priorisée par l'IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2"/>Importer
          </Button>
          <Button size="sm" onClick={() => setIdeeOpen(true)}>
            <Plus className="h-4 w-4 mr-2"/>Idée
          </Button>
        </div>
      </div>

      {/* Filtres compacts */}
      <div className="flex gap-2 flex-wrap text-sm">
        <Select value={filterPriorite} onValueChange={setFilterPriorite}>
          <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Priorité"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            {["P1","P2","P3","P4"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Statut"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUT_LABELS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Outliner */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin"/></div>
      ) : (
        <div className="font-sans text-sm">
          {poles.map(pole => {
            const items = filtered.filter(p => p.pole_id === pole.id);
            const open = expPoles[pole.id] ?? true;
            return (
              <div key={pole.id}>
                <button
                  className="w-full flex items-center gap-1.5 py-1.5 px-1 hover:bg-muted/40 rounded text-left"
                  onClick={() => setExpPoles(e => ({ ...e, [pole.id]: !open }))}
                  style={{ minHeight: 32 }}
                >
                  {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0"/> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>}
                  <span className="font-medium">{pole.numero}. {pole.nom}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">{items.length}</span>
                </button>
                {open && (
                  <div className="ml-2 pl-3 border-l border-border/60">
                    {items.length === 0 && <div className="py-1.5 text-xs text-muted-foreground italic">Aucun projet</div>}
                    {items.map(pr => (
                      <ProjetRow
                        key={pr.id}
                        projet={pr}
                        actions={actionsByProjet.get(pr.id) || []}
                        expanded={!!expProjets[pr.id]}
                        onToggle={() => setExpProjets(e => ({ ...e, [pr.id]: !e[pr.id] }))}
                        onToggleAction={toggleAction}
                        onAddAction={addAction}
                        onDeleteAction={deleteAction}
                        onChangeStatut={changeStatut}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} poles={poles} onDone={load}/>
      <IdeeDialog open={ideeOpen} onOpenChange={setIdeeOpen} poles={poles} onDone={load}/>

      {/* IA modal */}
      <Dialog open={iaLoading || !!iaResult} onOpenChange={(o)=>{ if(!o){ setIaResult(null); setIaProjetId(null);} }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Analyse stratégique IA</DialogTitle></DialogHeader>
          {iaLoading && <div className="flex justify-center p-8"><Loader2 className="animate-spin"/></div>}
          {iaResult && !iaLoading && (
            <div className="space-y-4">
              {iaResult.questions?.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Quelques questions avant les recommandations :</p>
                  {iaResult.questions.map((q: string, i: number) => (
                    <div key={i}>
                      <label className="text-sm font-medium">{q}</label>
                      <Textarea value={iaAnswers[i] || ""} onChange={e => {
                        const na = [...iaAnswers]; na[i] = e.target.value; setIaAnswers(na);
                      }} className="mt-1"/>
                    </div>
                  ))}
                  <Button onClick={submitAnswers}>Envoyer réponses</Button>
                </div>
              ) : (
                <>
                  {iaResult.suggestions?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Prochains projets recommandés</h3>
                      {iaResult.suggestions.map((s: any, i: number) => {
                        const p = projets.find(x => x.id === s.projet_id);
                        return (
                          <div key={i} className="p-3 border flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">{p?.nom || s.projet_id}</div>
                              <div className="text-xs text-muted-foreground">{s.justification}</div>
                            </div>
                            <Button size="sm" onClick={() => acceptSuggestion(s)}>Accepter</Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {iaResult.repriorisations?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Repriorisations proposées</h3>
                      {iaResult.repriorisations.map((r: any, i: number) => {
                        const p = projets.find(x => x.id === r.projet_id);
                        return (
                          <div key={i} className="p-3 border flex items-center justify-between gap-3">
                            <div>
                              <div className="font-medium">{p?.nom || r.projet_id} → {r.nouvelle_priorite}</div>
                              <div className="text-xs text-muted-foreground">{r.raison}</div>
                            </div>
                            <Button size="sm" onClick={() => acceptRepriorisation(r)}>Accepter</Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!iaResult.suggestions?.length && !iaResult.repriorisations?.length && (
                    <p className="text-sm text-muted-foreground">Aucune recommandation pour le moment.</p>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjetRow({
  projet, actions, expanded, onToggle, onToggleAction, onAddAction, onDeleteAction, onChangeStatut,
}: {
  projet: Projet;
  actions: Action[];
  expanded: boolean;
  onToggle: () => void;
  onToggleAction: (a: Action) => void;
  onAddAction: (projetId: string, texte: string) => void;
  onDeleteAction: (id: string) => void;
  onChangeStatut: (pr: Projet, statut: Projet["statut"]) => void;
}) {
  const [newAction, setNewAction] = useState("");
  const done = actions.filter(a => a.fait).length;
  const total = actions.length;
  const autos: string[] = Array.isArray(projet.automatisations) ? projet.automatisations : [];
  const kpis: string[] = Array.isArray(projet.kpis) ? projet.kpis : [];

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 px-1 hover:bg-muted/40 rounded cursor-pointer group"
        style={{ minHeight: 32 }}
        onClick={onToggle}
      >
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0"/> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0"/>}
        <ProjetBullet done={done} total={total} statut={projet.statut} />
        <span className={cn(
          "flex-1 truncate",
          projet.statut === "fait" && "line-through text-muted-foreground",
          projet.statut === "abandonne" && "text-muted-foreground italic",
        )}>{projet.nom}</span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 opacity-70 group-hover:opacity-100">
          {total > 0 && <span className="tabular-nums">{done}/{total}</span>}
          <span className="px-1.5 py-0.5 border border-border rounded-sm">{projet.priorite}</span>
          <span>D{projet.difficulte}</span>
          <span>I{projet.impact}</span>
        </div>
      </div>

      {expanded && (
        <div className="ml-4 pl-3 border-l border-border/60 py-2 space-y-3">
          {projet.objectif && (
            <div className="text-xs">
              <span className="text-muted-foreground">Objectif — </span>{projet.objectif}
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-1">
            {actions.map(a => (
              <div key={a.id} className="flex items-center gap-2 group" style={{ minHeight: 28 }}>
                <Checkbox checked={a.fait} onCheckedChange={() => onToggleAction(a)} />
                <span className={cn("text-xs flex-1", a.fait && "line-through text-muted-foreground")}>{a.texte}</span>
                <button
                  onClick={() => onDeleteAction(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3"/>
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Plus className="h-3 w-3 text-muted-foreground"/>
              <Input
                value={newAction}
                onChange={e => setNewAction(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { onAddAction(projet.id, newAction); setNewAction(""); }
                }}
                placeholder="Nouvelle action…"
                className="h-7 text-xs border-0 border-b rounded-none px-1 focus-visible:ring-0"
              />
            </div>
          </div>

          {autos.length > 0 && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">Automatisations</div>
              <ul className="space-y-0.5 ml-2">
                {autos.map((x, i) => <li key={i}>· {x}</li>)}
              </ul>
            </div>
          )}
          {kpis.length > 0 && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">KPI</div>
              <ul className="space-y-0.5 ml-2">
                {kpis.map((x, i) => <li key={i}>· {x}</li>)}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Select value={projet.statut} onValueChange={(v) => onChangeStatut(projet, v as any)}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue/></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUT_LABELS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {projet.resultat && (
              <span className="text-[10px] text-muted-foreground italic truncate">→ {projet.resultat}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ImportDialog({ open, onOpenChange, poles, onDone }: any) {
  const [poleId, setPoleId] = useState<string>("");
  const [md, setMd] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!poleId || !md.trim()) { toast.error("Pôle et contenu requis"); return; }
    setBusy(true);
    try {
      const projets = parseMarkdownProjets(md);
      if (projets.length === 0) { toast.error("Aucun projet détecté"); setBusy(false); return; }
      for (const p of projets) {
        const { data: inserted, error } = await supabase.from("projets" as any).insert({
          pole_id: poleId, nom: p.nom, objectif: p.objectif,
          automatisations: p.automatisations, kpis: p.kpis,
          priorite: p.priorite, difficulte: p.difficulte, impact: p.impact,
        }).select("id").single();
        if (error) throw error;
        if (p.actions?.length && inserted) {
          const rows = p.actions.map((texte, i) => ({
            projet_id: (inserted as any).id, ordre: i, texte,
          }));
          await supabase.from("actions" as any).insert(rows);
        }
      }
      toast.success(`${projets.length} projet(s) importé(s)`);
      onDone(); onOpenChange(false); setMd(""); setPoleId("");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Importer un pôle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={poleId} onValueChange={setPoleId}>
            <SelectTrigger><SelectValue placeholder="Choisir un pôle"/></SelectTrigger>
            <SelectContent>
              {poles.map((p: Pole)=><SelectItem key={p.id} value={p.id}>{p.numero}. {p.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={md} onChange={e=>setMd(e.target.value)} rows={16}
            placeholder="Markdown du pôle (### Projet : Nom, > P1 · Difficulté 2/5 · Impact 5/5, Actions/Automatisations/KPI)"/>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Import…" : "Importer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IdeeDialog({ open, onOpenChange, poles, onDone }: any) {
  const [nom, setNom] = useState("");
  const [poleId, setPoleId] = useState("");
  const submit = async () => {
    if (!nom || !poleId) { toast.error("Nom et pôle requis"); return; }
    const { error } = await supabase.from("projets" as any).insert({ nom, pole_id: poleId });
    if (error) toast.error(error.message);
    else { toast.success("Idée ajoutée"); onDone(); onOpenChange(false); setNom(""); setPoleId(""); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle idée</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Nom du projet"/>
          <Select value={poleId} onValueChange={setPoleId}>
            <SelectTrigger><SelectValue placeholder="Pôle"/></SelectTrigger>
            <SelectContent>
              {poles.map((p: Pole)=><SelectItem key={p.id} value={p.id}>{p.numero}. {p.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Upload, Loader2, X, TreePine, List, RotateCcw, CalendarCheck } from "lucide-react";
import { parseMarkdownProjets } from "@/lib/cockpit-markdown-parser";
import { cn } from "@/lib/utils";
import CockpitTree, { type TreeProjet, type TreePole } from "@/components/cockpit/CockpitTree";
import ProjetSidePanel from "@/components/cockpit/ProjetSidePanel";
import OnboardingChat from "@/components/cockpit/OnboardingChat";
import {
  EtoilePolaireBar, DebriefDialog, BacklogSection, RevueHebdoPanel,
  StagnationActions, StagnationBadge, ParetoSuggestionsPanel,
  daysSince,
  type Etoile, type Revue, type SuggestionPareto,
} from "@/components/cockpit/CockpitExtras";

type Pole = { id: string; numero: number; nom: string; objectif: string | null };
type Projet = {
  id: string; pole_id: string; nom: string; objectif: string | null;
  actions: any; automatisations: any; kpis: any;
  priorite: "P1" | "P2" | "P3" | "P4";
  difficulte: number; impact: number;
  statut: "a_faire" | "en_cours" | "fait" | "abandonne" | "archive";
  resultat: string | null; date_validation: string | null;
  recommande?: boolean;
  is_backlog?: boolean;
  score_roi_effort?: number | null;
  justification_pareto?: string | null;
  impact_etoile_polaire?: string | null;
  temps_reel?: string | null;
  a_refaire?: boolean | null;
  last_activity_at?: string | null;
};
type Action = {
  id: string; projet_id: string; ordre: number;
  texte: string; fait: boolean; date: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  a_faire: "À faire", en_cours: "En cours", fait: "Fait", abandonne: "Abandonné", archive: "Archivé",
};

function ProjetBullet({ done, total, statut }: { done: number; total: number; statut: string }) {
  const isDone = statut === "fait";
  const pct = total > 0 ? done / total : 0;
  const stroke = isDone || pct >= 1 ? "hsl(142 71% 45%)" : "hsl(var(--muted-foreground))";
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke={stroke} strokeWidth="1.2" />
      {(isDone || pct >= 1) && <circle cx="6" cy="6" r="3" fill={stroke} />}
      {pct > 0 && pct < 1 && !isDone && (
        <path d="M6,1.5 A4.5,4.5 0 0,1 6,10.5 Z" fill={stroke} opacity="0.6" />
      )}
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
  const [vue, setVue] = useState<"tree" | "list">("tree");
  const [selectedProjetId, setSelectedProjetId] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [iaBusy, setIaBusy] = useState(false);

  const [etoile, setEtoile] = useState<Etoile | null>(null);
  const [revues, setRevues] = useState<Revue[]>([]);
  const [revuesOpen, setRevuesOpen] = useState(false);
  const [revueBusy, setRevueBusy] = useState(false);
  const [debriefProjet, setDebriefProjet] = useState<Projet | null>(null);
  const [paretoSugs, setParetoSugs] = useState<SuggestionPareto[]>([]);
  const [paretoOpen, setParetoOpen] = useState(false);
  const [decoupeBusy, setDecoupeBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    const [{ data: p }, { data: pr }, { data: a }, { data: e }, { data: r }] = await Promise.all([
      supabase.from("poles" as any).select("*").order("numero"),
      supabase.from("projets" as any).select("*").order("created_at"),
      supabase.from("actions" as any).select("*").order("ordre"),
      uid ? supabase.from("etoile_polaire" as any).select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      uid ? supabase.from("revues_hebdo" as any).select("*").eq("user_id", uid).order("semaine_debut", { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
    ]);
    setPoles((p as any) || []);
    setProjets((pr as any) || []);
    setActions((a as any) || []);
    setEtoile((e as any) || null);
    setRevues((r as any) || []);
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

  const activeProjets = useMemo(() => projets.filter(p => !p.is_backlog), [projets]);
  const backlogProjets = useMemo(() => projets.filter(p => p.is_backlog), [projets]);

  const treeProjets = useMemo<TreeProjet[]>(() => activeProjets.map(pr => {
    const list = actionsByProjet.get(pr.id) || [];
    return {
      id: pr.id, pole_id: pr.pole_id, nom: pr.nom,
      statut: pr.statut, recommande: !!pr.recommande,
      done: list.filter(a => a.fait).length,
      total: list.length,
    };
  }), [activeProjets, actionsByProjet]);

  const treePoles = useMemo<TreePole[]>(() =>
    poles.map(p => ({ id: p.id, numero: p.numero, nom: p.nom })), [poles]);

  const enCours = useMemo(() => activeProjets.filter(p => p.statut === "en_cours").slice(0, 3), [activeProjets]);
  const selectedProjet = useMemo(() => projets.find(p => p.id === selectedProjetId) || null, [projets, selectedProjetId]);

  const filtered = useMemo(() => activeProjets.filter(pr => {
    if (pr.statut === "archive" && filterStatut !== "archive") return false;
    if (filterPriorite !== "all" && pr.priorite !== filterPriorite) return false;
    if (filterStatut !== "all" && pr.statut !== filterStatut) return false;
    return true;
  }), [activeProjets, filterPriorite, filterStatut]);

  const isStagnant = (pr: Projet) => {
    if (pr.statut !== "en_cours") return false;
    const list = actionsByProjet.get(pr.id) || [];
    const lastCheck = list.filter(a => a.fait && a.date).map(a => a.date!).sort().pop();
    const ref = lastCheck || pr.last_activity_at;
    return daysSince(ref || null) >= 7;
  };

  const generateNext = async (projet_valide?: { id: string; nom: string; resultat?: string | null }) => {
    setIaBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("cockpit-ia-plan", {
        body: { mode: "next", projet_valide },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.skipped) {
        toast.info(data.reason || "3 projets déjà actifs");
      } else if (data?.projets?.length) {
        toast.success(`${data.projets.length} nouveau(x) projet(s) proposé(s) par l'IA`);
        // Also show top 2 backlog items as alternatives
        const topBacklog = [...backlogProjets]
          .sort((a,b)=>(b.score_roi_effort||0)-(a.score_roi_effort||0))
          .slice(0, 2)
          .map<SuggestionPareto>(b => ({
            id: b.id, nom: b.nom,
            score_roi_effort: b.score_roi_effort,
            justification_pareto: b.justification_pareto,
            impact_etoile_polaire: null,
            source: "backlog",
          }));
        const iaSugs: SuggestionPareto[] = data.projets.map((s: any) => ({
          id: s.id, nom: s.nom,
          score_roi_effort: s.score_roi_effort,
          justification_pareto: s.justification_pareto,
          impact_etoile_polaire: s.impact_etoile_polaire,
          source: "ia" as const,
        }));
        setParetoSugs([...iaSugs, ...topBacklog]);
        setParetoOpen(true);
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "L'IA n'a pas pu générer");
    } finally {
      setIaBusy(false);
    }
  };

  const toggleAction = async (a: Action) => {
    const nowDone = !a.fait;
    const { error } = await supabase.from("actions" as any).update({
      fait: nowDone, date: nowDone ? new Date().toISOString() : null,
    }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    const nextActions = actions.map(x => x.id === a.id ? { ...x, fait: nowDone, date: nowDone ? new Date().toISOString() : null } : x);
    setActions(nextActions);

    const projetActions = nextActions.filter(x => x.projet_id === a.projet_id);
    const allDone = projetActions.length > 0 && projetActions.every(x => x.fait);
    const projet = projets.find(p => p.id === a.projet_id);
    if (!projet) return;

    // Update last_activity_at
    if (nowDone) {
      await supabase.from("projets" as any).update({ last_activity_at: new Date().toISOString() }).eq("id", projet.id);
    }

    if (allDone && projet.statut !== "fait") {
      // Open débrief BEFORE closing / calling IA
      setDebriefProjet(projet);
    } else if (!allDone && projet.statut === "a_faire" && projetActions.some(x => x.fait)) {
      await supabase.from("projets" as any).update({ statut: "en_cours" }).eq("id", projet.id);
      setProjets(projets.map(p => p.id === projet.id ? { ...p, statut: "en_cours" } : p));
    }
  };

  const submitDebrief = async (r: { resultat: string; temps_reel: string; a_refaire: boolean }) => {
    if (!debriefProjet) return;
    const projet = debriefProjet;
    setDebriefProjet(null);
    const { error } = await supabase.from("projets" as any).update({
      statut: "fait", resultat: r.resultat, temps_reel: r.temps_reel, a_refaire: r.a_refaire,
      date_validation: new Date().toISOString(),
    }).eq("id", projet.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Projet complété !");
    await load();
    await generateNext({ id: projet.id, nom: projet.nom, resultat: r.resultat });
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
      const active = activeProjets.filter(p => p.statut === "en_cours" && p.id !== pr.id).length;
      if (active >= 3) {
        toast.error("Max 3 projets actifs — termine ou abandonne d'abord");
        return;
      }
    }
    const { error } = await supabase.from("projets" as any).update({ statut }).eq("id", pr.id);
    if (error) toast.error(error.message);
    else load();
  };

  const doRestart = async () => {
    setConfirmRestart(false);
    const { error } = await supabase.from("projets" as any).update({ statut: "archive", recommande: false }).neq("statut", "archive");
    if (error) { toast.error(error.message); return; }
    await load();
    setOnboardingOpen(true);
  };

  const finishOnboarding = async (answers: Record<string, string>) => {
    let uid: string | undefined;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      uid = sessionData.session?.user?.id;
      if (!uid) {
        const { data: userData } = await supabase.auth.getUser();
        uid = userData.user?.id;
      }
    } catch (err) { console.error("[cockpit] auth resolve failed", err); }
    if (!uid) { toast.error("Session expirée — reconnecte-toi puis relance"); return; }
    const { error: e1 } = await supabase.from("contexte_business" as any).insert({
      user_id: uid, reponses: answers,
    });
    if (e1) { toast.error(e1.message); return; }
    const { data, error } = await supabase.functions.invoke("cockpit-ia-plan", { body: { mode: "initial" } });
    if (error || data?.error) toast.error(error?.message || data?.error || "Erreur IA");
    else toast.success(`${data.projets?.length || 0} projets créés pour démarrer`);
    setOnboardingOpen(false);
    await load();
  };

  // ============ BACKLOG ============
  const activateBacklog = async (id: string) => {
    const active = activeProjets.filter(p => p.statut === "en_cours").length;
    if (active >= 3) { toast.error("Max 3 projets actifs"); return; }
    const projet = projets.find(p => p.id === id);
    if (!projet) return;
    // Mark as active + generate actions via IA (reuse decoupe mode)
    await supabase.from("projets" as any).update({ is_backlog: false, statut: "en_cours" }).eq("id", id);
    toast.info("Génération des actions par l'IA…");
    setIaBusy(true);
    try {
      await supabase.functions.invoke("cockpit-ia-plan", { body: { mode: "decoupe", projet_id: id } });
    } catch (e: any) { toast.error(e.message); }
    setIaBusy(false);
    await load();
  };

  const deleteBacklog = async (id: string) => {
    const { error } = await supabase.from("projets" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Idée supprimée"); load(); }
  };

  const rescoreBacklog = async () => {
    const toScore = backlogProjets.filter(b => b.score_roi_effort == null).map(b => b.id);
    if (!toScore.length) { toast.info("Toutes les idées sont déjà scorées"); return; }
    setIaBusy(true);
    const { error } = await supabase.functions.invoke("cockpit-ia-score", { body: { projet_ids: toScore } });
    setIaBusy(false);
    if (error) toast.error(error.message); else { toast.success("Scorées"); load(); }
  };

  // ============ REVUE HEBDO ============
  const genRevue = async () => {
    setRevueBusy(true);
    const { data, error } = await supabase.functions.invoke("cockpit-ia-revue", { body: {} });
    setRevueBusy(false);
    if (error || data?.error) toast.error(error?.message || data?.error || "Erreur");
    else { toast.success("Revue générée"); load(); }
  };

  // ============ STAGNATION ============
  const doDecoupe = async (pr: Projet) => {
    setDecoupeBusy(pr.id);
    const { data, error } = await supabase.functions.invoke("cockpit-ia-plan", { body: { mode: "decoupe", projet_id: pr.id } });
    setDecoupeBusy(null);
    if (error || data?.error) toast.error(error?.message || data?.error);
    else { toast.success("Actions redécoupées"); load(); }
  };

  const doBacklogReport = async (pr: Projet) => {
    await supabase.from("projets" as any).update({ is_backlog: true, statut: "a_faire" }).eq("id", pr.id);
    toast.success("Reporté au backlog"); load();
  };

  return (
    <div className={cn(vue === "tree" ? "space-y-3" : "space-y-6")}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Cockpit Stratégique</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ma roadmap vivante {iaBusy && <Loader2 className="inline h-3 w-3 animate-spin ml-1"/>}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="inline-flex border border-border rounded-none overflow-hidden">
            <button
              onClick={() => setVue("tree")}
              className={cn("px-3 py-1.5 text-xs flex items-center gap-1.5", vue === "tree" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50")}
            ><TreePine className="h-3.5 w-3.5"/>Arbre</button>
            <button
              onClick={() => setVue("list")}
              className={cn("px-3 py-1.5 text-xs flex items-center gap-1.5 border-l border-border", vue === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50")}
            ><List className="h-3.5 w-3.5"/>Liste</button>
          </div>
          <Button variant="outline" size="sm" onClick={()=>setRevuesOpen(true)}>
            <CalendarCheck className="h-4 w-4 mr-2"/>Revue
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConfirmRestart(true)}>
            <RotateCcw className="h-4 w-4 mr-2"/>Recommencer
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2"/>Importer
          </Button>
          <Button size="sm" onClick={() => setIdeeOpen(true)}>
            <Plus className="h-4 w-4 mr-2"/>Idée
          </Button>
        </div>
      </div>

      <EtoilePolaireBar etoile={etoile} onSaved={load}/>

      {vue === "list" && (
        <>
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
                            stagnant={isStagnant(pr)}
                            decoupeBusy={decoupeBusy === pr.id}
                            onToggle={() => setExpProjets(e => ({ ...e, [pr.id]: !e[pr.id] }))}
                            onToggleAction={toggleAction}
                            onAddAction={addAction}
                            onDeleteAction={deleteAction}
                            onChangeStatut={changeStatut}
                            onDecoupe={()=>doDecoupe(pr)}
                            onBacklog={()=>doBacklogReport(pr)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {vue === "tree" && (
        <div className="relative w-full" style={{ height: "calc(100vh - 16rem)" }}>
          {loading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin"/></div>
          ) : (
            <CockpitTree
              poles={treePoles}
              projets={treeProjets}
              onSelectProjet={setSelectedProjetId}
              selectedProjetId={selectedProjetId}
            />
          )}

          {!loading && (
            <div className="absolute top-3 left-3 max-w-xs bg-background/95 backdrop-blur border border-border p-3 text-xs space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cette semaine · {enCours.length}/3</div>
              {enCours.length === 0 && <div className="text-muted-foreground italic">Aucun projet actif</div>}
              {enCours.map(pr => {
                const list = actionsByProjet.get(pr.id) || [];
                const done = list.filter(a => a.fait).length;
                const total = list.length;
                const pct = total ? (done/total)*100 : 0;
                const stag = isStagnant(pr);
                return (
                  <button
                    key={pr.id}
                    onClick={() => setSelectedProjetId(pr.id)}
                    className="block w-full text-left hover:bg-muted -mx-1 px-1 py-0.5"
                  >
                    <div className="truncate flex items-center gap-1">
                      {pr.nom}
                      {stag && <StagnationBadge/>}
                    </div>
                    <div className="h-0.5 bg-muted mt-1">
                      <div className="h-full bg-foreground" style={{ width: `${pct}%` }}/>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedProjet && (
            <>
              <ProjetSidePanel
                projet={selectedProjet as any}
                poleName={poles.find(p => p.id === selectedProjet.pole_id)?.nom || ""}
                actions={actionsByProjet.get(selectedProjet.id) || []}
                onClose={() => setSelectedProjetId(null)}
                onToggleAction={toggleAction}
                onAddAction={addAction}
                onDeleteAction={deleteAction}
                onChangeStatut={(s) => changeStatut(selectedProjet, s)}
              />
              {isStagnant(selectedProjet) && (
                <div className="fixed z-50 right-3 md:right-[416px] top-3 w-72">
                  <StagnationActions
                    projetId={selectedProjet.id}
                    busy={decoupeBusy === selectedProjet.id}
                    onDecoupe={()=>doDecoupe(selectedProjet)}
                    onBacklog={()=>doBacklogReport(selectedProjet)}
                    onAbandon={()=>changeStatut(selectedProjet, "abandonne")}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!loading && (
        <BacklogSection
          items={backlogProjets.map(b => ({
            id: b.id, nom: b.nom, objectif: b.objectif, pole_id: b.pole_id,
            score_roi_effort: b.score_roi_effort ?? null,
            justification_pareto: b.justification_pareto ?? null,
          }))}
          poles={poles}
          onActivate={activateBacklog}
          onDelete={deleteBacklog}
          onRescore={rescoreBacklog}
        />
      )}

      <RevueHebdoPanel open={revuesOpen} onClose={()=>setRevuesOpen(false)} onGenerate={genRevue} busy={revueBusy} revues={revues}/>

      <ParetoSuggestionsPanel
        open={paretoOpen}
        onClose={()=>setParetoOpen(false)}
        suggestions={paretoSugs}
        onActivate={(id)=>{ activateBacklog(id); setParetoOpen(false); }}
      />

      <DebriefDialog
        open={!!debriefProjet}
        onOpenChange={(v)=>!v && setDebriefProjet(null)}
        projetNom={debriefProjet?.nom || ""}
        onSubmit={submitDebrief}
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} poles={poles} onDone={load}/>
      <IdeeDialog open={ideeOpen} onOpenChange={setIdeeOpen} poles={poles} onDone={load}/>

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recommencer de zéro ?</DialogTitle>
            <DialogDescription>
              Tous tes projets actuels seront archivés (jamais supprimés). L'IA te posera ensuite 6 questions
              pour reconstruire un plan de 3 projets adaptés à ta situation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestart(false)}>Annuler</Button>
            <Button onClick={doRestart}>Oui, tout archiver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OnboardingChat
        open={onboardingOpen}
        onCancel={() => setOnboardingOpen(false)}
        onFinish={finishOnboarding}
      />
    </div>
  );
}

function ProjetRow({
  projet, actions, expanded, stagnant, decoupeBusy,
  onToggle, onToggleAction, onAddAction, onDeleteAction, onChangeStatut,
  onDecoupe, onBacklog,
}: {
  projet: Projet;
  actions: Action[];
  expanded: boolean;
  stagnant: boolean;
  decoupeBusy: boolean;
  onToggle: () => void;
  onToggleAction: (a: Action) => void;
  onAddAction: (projetId: string, texte: string) => void;
  onDeleteAction: (id: string) => void;
  onChangeStatut: (pr: Projet, statut: Projet["statut"]) => void;
  onDecoupe: () => void;
  onBacklog: () => void;
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
          (projet.statut === "abandonne" || projet.statut === "archive") && "text-muted-foreground italic",
        )}>
          {projet.nom}
          {stagnant && <StagnationBadge/>}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0 opacity-70 group-hover:opacity-100">
          {projet.score_roi_effort != null && <span className="px-1.5 py-0.5 border border-border rounded-sm font-mono">{projet.score_roi_effort}/10</span>}
          {total > 0 && <span className="tabular-nums">{done}/{total}</span>}
          <span className="px-1.5 py-0.5 border border-border rounded-sm">{projet.priorite}</span>
          <span>D{projet.difficulte}</span>
          <span>I{projet.impact}</span>
        </div>
      </div>

      {expanded && (
        <div className="ml-4 pl-3 border-l border-border/60 py-2 space-y-3">
          {projet.objectif && (
            <div className="text-xs"><span className="text-muted-foreground">Objectif — </span>{projet.objectif}</div>
          )}
          {projet.justification_pareto && (
            <div className="text-xs italic text-muted-foreground">« {projet.justification_pareto} »</div>
          )}
          {projet.impact_etoile_polaire && (
            <div className="text-xs">Impact étoile : {projet.impact_etoile_polaire}</div>
          )}
          {stagnant && (
            <StagnationActions
              projetId={projet.id} busy={decoupeBusy}
              onDecoupe={onDecoupe} onBacklog={onBacklog}
              onAbandon={()=>onChangeStatut(projet, "abandonne")}
            />
          )}

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
              <ul className="space-y-0.5 ml-2">{autos.map((x, i) => <li key={i}>· {x}</li>)}</ul>
            </div>
          )}
          {kpis.length > 0 && (
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">KPI</div>
              <ul className="space-y-0.5 ml-2">{kpis.map((x, i) => <li key={i}>· {x}</li>)}</ul>
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
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!nom || !poleId) { toast.error("Nom et pôle requis"); return; }
    setBusy(true);
    const { data: inserted, error } = await supabase.from("projets" as any).insert({
      nom, pole_id: poleId, is_backlog: true, statut: "a_faire",
    }).select("id").single();
    if (error) { toast.error(error.message); setBusy(false); return; }
    // Score in background
    try {
      await supabase.functions.invoke("cockpit-ia-score", { body: { projet_ids: [(inserted as any).id] } });
    } catch {}
    setBusy(false);
    toast.success("Idée ajoutée au backlog");
    onDone(); onOpenChange(false); setNom(""); setPoleId("");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle idée</DialogTitle>
          <DialogDescription>L'idée part dans le backlog et sera scorée par l'IA.</DialogDescription>
        </DialogHeader>
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
          <Button onClick={submit} disabled={busy}>{busy ? "…" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

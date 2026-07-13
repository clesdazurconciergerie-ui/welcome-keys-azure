import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, CheckCircle2, Plus, Upload, Sparkles, Loader2 } from "lucide-react";
import { parseMarkdownProjets } from "@/lib/cockpit-markdown-parser";

type Pole = { id: string; numero: number; nom: string; objectif: string | null };
type Projet = {
  id: string; pole_id: string; nom: string; objectif: string | null;
  actions: any; automatisations: any; kpis: any;
  priorite: "P1" | "P2" | "P3" | "P4";
  difficulte: number; impact: number;
  statut: "a_faire" | "en_cours" | "fait" | "abandonne";
  resultat: string | null; date_validation: string | null;
};

const PRIORITE_COLORS: Record<string, string> = {
  P1: "bg-black text-white", P2: "bg-neutral-700 text-white",
  P3: "bg-neutral-300 text-black", P4: "bg-neutral-100 text-neutral-600",
};
const STATUT_LABELS: Record<string, string> = {
  a_faire: "À faire", en_cours: "En cours", fait: "Fait", abandonne: "Abandonné",
};

export default function CockpitPage() {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filterPriorite, setFilterPriorite] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterPole, setFilterPole] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [ideeOpen, setIdeeOpen] = useState(false);
  const [validateProjet, setValidateProjet] = useState<Projet | null>(null);
  const [iaResult, setIaResult] = useState<any>(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaAnswers, setIaAnswers] = useState<string[]>([]);
  const [iaProjetContext, setIaProjetContext] = useState<{ nom: string; resultat: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from("poles" as any).select("*").order("numero"),
      supabase.from("projets" as any).select("*").order("created_at"),
    ]);
    setPoles((p as any) || []);
    setProjets((pr as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => projets.filter(pr => {
    if (filterPriorite !== "all" && pr.priorite !== filterPriorite) return false;
    if (filterStatut !== "all" && pr.statut !== filterStatut) return false;
    if (filterPole !== "all" && pr.pole_id !== filterPole) return false;
    return true;
  }), [projets, filterPriorite, filterStatut, filterPole]);

  const cetteSemaine = useMemo(
    () => projets.filter(p => p.statut === "en_cours").slice(0, 3),
    [projets]
  );

  const toggleStatut = async (pr: Projet, statut: Projet["statut"]) => {
    const { error } = await supabase.from("projets" as any).update({ statut }).eq("id", pr.id);
    if (error) toast.error(error.message); else { toast.success("Statut mis à jour"); load(); }
  };

  const openValidate = (pr: Projet) => { setValidateProjet(pr); };

  const submitValidate = async (resultat: string) => {
    if (!validateProjet) return;
    const { error } = await supabase.from("projets" as any).update({
      statut: "fait", resultat, date_validation: new Date().toISOString(),
    }).eq("id", validateProjet.id);
    if (error) { toast.error(error.message); return; }
    const projetNom = validateProjet.nom;
    setValidateProjet(null);
    setIaProjetContext({ nom: projetNom, resultat });
    await load();
    await callIA(projetNom, resultat);
  };

  const callIA = async (projet_valide: string, resultat: string, reponses_questions?: string[]) => {
    setIaLoading(true);
    setIaResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("cockpit-ia-suggest", {
        body: { projet_valide, resultat, reponses_questions },
      });
      if (error) throw error;
      setIaResult(data);
      // log
      const projetRow = projets.find(p => p.nom === projet_valide);
      await supabase.from("suggestions_ia" as any).insert({
        projet_id: projetRow?.id ?? null, contenu: data, acceptee: false,
      });
      if (data.questions?.length) setIaAnswers(data.questions.map(() => ""));
    } catch (e: any) {
      toast.error("Erreur IA : " + e.message);
    } finally {
      setIaLoading(false);
    }
  };

  const submitAnswers = async () => {
    if (!iaProjetContext) return;
    await callIA(iaProjetContext.nom, iaProjetContext.resultat, iaAnswers);
  };

  const acceptSuggestion = async (s: any) => {
    // Créer un projet "à faire" dans le pôle Vision Long Terme par défaut (ou premier pôle)
    const pole = poles[0];
    if (!pole) return;
    const { error } = await supabase.from("projets" as any).insert({
      pole_id: pole.id, nom: s.projet, objectif: s.justification,
      priorite: "P2", statut: "a_faire",
    });
    if (error) toast.error(error.message);
    else { toast.success("Projet ajouté"); load(); }
  };

  const acceptRepriorisation = async (r: any) => {
    const projet = projets.find(p => p.nom === r.projet);
    if (!projet) { toast.error("Projet introuvable"); return; }
    const { error } = await supabase.from("projets" as any).update({
      priorite: r.nouvelle_priorite,
    }).eq("id", projet.id);
    if (error) toast.error(error.message);
    else { toast.success("Priorité mise à jour"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Cockpit Stratégique</h1>
          <p className="text-sm text-muted-foreground mt-1">Ma roadmap vivante, re-priorisée par l'IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4 mr-2"/>Importer un pôle</Button>
          <Button onClick={() => setIdeeOpen(true)}><Plus className="h-4 w-4 mr-2"/>Idée</Button>
        </div>
      </div>

      {/* Cette semaine */}
      <Card className="p-5 border-2 border-black">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" />
          <h2 className="font-semibold">Cette semaine</h2>
        </div>
        {cetteSemaine.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet en cours.</p>}
        <div className="grid gap-2">
          {cetteSemaine.map(pr => (
            <div key={pr.id} className="flex items-center justify-between p-3 bg-neutral-50">
              <div>
                <div className="font-medium">{pr.nom}</div>
                <div className="text-xs text-muted-foreground">{poles.find(p=>p.id===pr.pole_id)?.nom}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge className={PRIORITE_COLORS[pr.priorite]}>{pr.priorite}</Badge>
                <Button size="sm" variant="outline" onClick={() => openValidate(pr)}>
                  <CheckCircle2 className="h-4 w-4 mr-1"/>Valider
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterPriorite} onValueChange={setFilterPriorite}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Priorité"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes priorités</SelectItem>
            {["P1","P2","P3","P4"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUT_LABELS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPole} onValueChange={setFilterPole}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Pôle"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous pôles</SelectItem>
            {poles.map(p=><SelectItem key={p.id} value={p.id}>{p.numero}. {p.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Arborescence */}
      {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin"/></div> : (
        <div className="space-y-2">
          {poles.map(pole => {
            const items = filtered.filter(p => p.pole_id === pole.id);
            const open = expanded[pole.id] ?? true;
            return (
              <Card key={pole.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center gap-2 p-4 hover:bg-neutral-50"
                  onClick={() => setExpanded(e => ({ ...e, [pole.id]: !open }))}
                >
                  {open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                  <span className="font-semibold">{pole.numero}. {pole.nom}</span>
                  <span className="text-xs text-muted-foreground ml-2">{items.length} projet{items.length>1?"s":""}</span>
                </button>
                {open && (
                  <div className="border-t divide-y">
                    {items.length === 0 && <div className="p-4 text-sm text-muted-foreground">Aucun projet</div>}
                    {items.map(pr => (
                      <div key={pr.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-medium">{pr.nom}</div>
                            {pr.objectif && <div className="text-sm text-muted-foreground mt-1">{pr.objectif}</div>}
                            <div className="flex gap-1 mt-2 flex-wrap">
                              <Badge className={PRIORITE_COLORS[pr.priorite]}>{pr.priorite}</Badge>
                              <Badge variant="outline">Diff {pr.difficulte}/5</Badge>
                              <Badge variant="outline">Impact {pr.impact}/5</Badge>
                              <Badge variant="secondary">{STATUT_LABELS[pr.statut]}</Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Select value={pr.statut} onValueChange={(v) => toggleStatut(pr, v as any)}>
                              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue/></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUT_LABELS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {pr.statut !== "fait" && (
                              <Button size="sm" variant="outline" onClick={() => openValidate(pr)}>
                                <CheckCircle2 className="h-3 w-3 mr-1"/>Valider
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Import */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} poles={poles} onDone={load}/>
      {/* Idée */}
      <IdeeDialog open={ideeOpen} onOpenChange={setIdeeOpen} poles={poles} onDone={load}/>
      {/* Valider */}
      <ValidateDialog projet={validateProjet} onClose={()=>setValidateProjet(null)} onSubmit={submitValidate}/>
      {/* IA modal */}
      <Dialog open={iaLoading || !!iaResult} onOpenChange={(o)=>{ if(!o){ setIaResult(null); setIaProjetContext(null);} }}>
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
                  <Button onClick={submitAnswers} disabled={iaLoading}>Envoyer réponses</Button>
                </div>
              ) : (
                <>
                  {iaResult.suggestions?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Prochains projets recommandés</h3>
                      {iaResult.suggestions.map((s: any, i: number) => (
                        <div key={i} className="p-3 border flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{s.projet}</div>
                            <div className="text-xs text-muted-foreground">{s.justification}</div>
                          </div>
                          <Button size="sm" onClick={() => acceptSuggestion(s)}>Accepter</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {iaResult.repriorisations?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Repriorisations proposées</h3>
                      {iaResult.repriorisations.map((r: any, i: number) => (
                        <div key={i} className="p-3 border flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{r.projet} → {r.nouvelle_priorite}</div>
                            <div className="text-xs text-muted-foreground">{r.raison}</div>
                          </div>
                          <Button size="sm" onClick={() => acceptRepriorisation(r)}>Accepter</Button>
                        </div>
                      ))}
                    </div>
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
      const rows = projets.map(p => ({
        pole_id: poleId, nom: p.nom, objectif: p.objectif,
        actions: p.actions, automatisations: p.automatisations, kpis: p.kpis,
        priorite: p.priorite, difficulte: p.difficulte, impact: p.impact,
      }));
      const { error } = await supabase.from("projets" as any).insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} projet(s) importé(s)`);
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
            placeholder="Collez ici le markdown de votre pôle (### Projet : Nom, > P1 · Difficulté 2/5 · Impact 5/5, listes Objectif/Actions/Automatisations/KPI)"/>
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

function ValidateDialog({ projet, onClose, onSubmit }: any) {
  const [resultat, setResultat] = useState("");
  useEffect(() => { setResultat(""); }, [projet]);
  return (
    <Dialog open={!!projet} onOpenChange={(o)=>{ if(!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Valider : {projet?.nom}</DialogTitle></DialogHeader>
        <Textarea value={resultat} onChange={e=>setResultat(e.target.value)} rows={5}
          placeholder="Résultat obtenu (chiffres, apprentissages, ce qui a marché ou pas…)"/>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={()=>onSubmit(resultat)} disabled={!resultat.trim()}>Valider et analyser</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Star, ChevronDown, ChevronRight, X, AlertTriangle, Scissors, Archive, Loader2, Sparkles, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// ============ ÉTOILE POLAIRE ============
export type Etoile = {
  id: string; user_id: string;
  nom_metrique: string; valeur_cible: number; valeur_actuelle: number;
  echeance: string | null; updated_at: string;
};

export function EtoilePolaireBar({ etoile, onSaved }: { etoile: Etoile | null; onSaved: () => void }) {
  const [editing, setEditing] = useState(!etoile);
  const [nom, setNom] = useState(etoile?.nom_metrique || "");
  const [cible, setCible] = useState<string>(etoile ? String(etoile.valeur_cible) : "");
  const [actuelle, setActuelle] = useState<string>(etoile ? String(etoile.valeur_actuelle) : "0");
  const [echeance, setEcheance] = useState(etoile?.echeance || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (etoile) {
      setNom(etoile.nom_metrique);
      setCible(String(etoile.valeur_cible));
      setActuelle(String(etoile.valeur_actuelle));
      setEcheance(etoile.echeance || "");
    }
  }, [etoile?.id]);

  const save = async () => {
    if (!nom.trim() || !cible) { toast.error("Nom + cible requis"); return; }
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) { toast.error("Non connecté"); setBusy(false); return; }
    const payload = {
      user_id: uid, nom_metrique: nom.trim(),
      valeur_cible: Number(cible), valeur_actuelle: Number(actuelle) || 0,
      echeance: echeance || null,
    };
    const { error } = etoile
      ? await supabase.from("etoile_polaire" as any).update(payload).eq("id", etoile.id)
      : await supabase.from("etoile_polaire" as any).insert(payload);
    setBusy(false);
    if (error) toast.error(error.message);
    else { setEditing(false); onSaved(); }
  };

  if (editing) {
    return (
      <div className="border border-border p-3 bg-muted/20 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
          <Star className="h-3.5 w-3.5"/> Étoile Polaire — ta métrique reine
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <Input placeholder="Métrique (ex: CA mensuel €)" value={nom} onChange={e=>setNom(e.target.value)} className="h-8 text-sm"/>
          <Input placeholder="Cible" type="number" value={cible} onChange={e=>setCible(e.target.value)} className="h-8 text-sm"/>
          <Input placeholder="Actuelle" type="number" value={actuelle} onChange={e=>setActuelle(e.target.value)} className="h-8 text-sm"/>
          <Input placeholder="Échéance" type="date" value={echeance} onChange={e=>setEcheance(e.target.value)} className="h-8 text-sm"/>
        </div>
        <div className="flex gap-2 justify-end">
          {etoile && <Button size="sm" variant="ghost" onClick={()=>setEditing(false)}>Annuler</Button>}
          <Button size="sm" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</Button>
        </div>
      </div>
    );
  }

  if (!etoile) return null;
  const pct = etoile.valeur_cible > 0 ? Math.min(100, (etoile.valeur_actuelle / etoile.valeur_cible) * 100) : 0;
  return (
    <div className="border border-border p-3 flex items-center gap-3 group hover:bg-muted/20 cursor-pointer" onClick={()=>setEditing(true)}>
      <Star className="h-4 w-4 shrink-0"/>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium truncate">{etoile.nom_metrique}</div>
          <div className="text-xs tabular-nums text-muted-foreground shrink-0">
            {etoile.valeur_actuelle} / {etoile.valeur_cible}
            {etoile.echeance && <span className="ml-2">· {new Date(etoile.echeance).toLocaleDateString("fr-FR")}</span>}
          </div>
        </div>
        <div className="h-1 bg-muted mt-1.5">
          <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }}/>
        </div>
      </div>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100"/>
    </div>
  );
}

// ============ DÉBRIEF DE FIN DE PROJET ============
export function DebriefDialog({
  open, onOpenChange, projetNom, onSubmit,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  projetNom: string;
  onSubmit: (r: { resultat: string; temps_reel: string; a_refaire: boolean }) => void;
}) {
  const [resultat, setResultat] = useState("");
  const [tempsReel, setTempsReel] = useState("3h");
  const [aRefaire, setARefaire] = useState<"oui" | "non">("oui");

  useEffect(() => { if (open) { setResultat(""); setTempsReel("3h"); setARefaire("oui"); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Débrief · {projetNom}</DialogTitle>
          <DialogDescription>3 questions rapides pour calibrer les prochaines suggestions IA.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Résultat obtenu</label>
            <Input value={resultat} onChange={e=>setResultat(e.target.value)} placeholder="Ex: +2 propriétaires signés, script rodé…"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Temps réel passé</label>
              <Select value={tempsReel} onValueChange={setTempsReel}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["1h","3h","1j","3j","1sem+"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">À refaire ?</label>
              <Select value={aRefaire} onValueChange={v=>setARefaire(v as any)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oui">Oui</SelectItem>
                  <SelectItem value="non">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Plus tard</Button>
          <Button onClick={()=>onSubmit({ resultat, temps_reel: tempsReel, a_refaire: aRefaire === "oui" })} disabled={!resultat.trim()}>
            Envoyer & suggérer la suite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ BACKLOG ============
export type BacklogItem = {
  id: string; nom: string; objectif: string | null; pole_id: string;
  score_roi_effort: number | null; justification_pareto: string | null;
};

export function BacklogSection({
  items, poles, onActivate, onDelete, onRescore,
}: {
  items: BacklogItem[];
  poles: { id: string; numero: number; nom: string }[];
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onRescore: () => void;
}) {
  const [open, setOpen] = useState(true);
  const poleById = new Map(poles.map(p => [p.id, `${p.numero}. ${p.nom}`]));
  const sorted = [...items].sort((a,b) => (b.score_roi_effort || 0) - (a.score_roi_effort || 0));

  return (
    <div className="border border-border">
      <button onClick={()=>setOpen(v=>!v)} className="w-full flex items-center gap-2 p-2 hover:bg-muted/40 text-left">
        {open ? <ChevronDown className="h-3.5 w-3.5"/> : <ChevronRight className="h-3.5 w-3.5"/>}
        <span className="text-sm font-medium">Backlog d'idées</span>
        <span className="text-xs text-muted-foreground">{items.length}</span>
        {items.some(i => i.score_roi_effort == null) && (
          <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={(e)=>{e.stopPropagation(); onRescore();}}>
            <Sparkles className="h-3 w-3 mr-1"/>Scorer
          </Button>
        )}
      </button>
      {open && (
        <div className="divide-y divide-border">
          {sorted.length === 0 && <div className="p-3 text-xs text-muted-foreground italic">Aucune idée en backlog</div>}
          {sorted.map(it => (
            <div key={it.id} className="p-2 flex items-start gap-2 group">
              <div className="w-8 shrink-0 text-center">
                <div className="text-sm font-mono tabular-nums">{it.score_roi_effort ?? "—"}</div>
                <div className="text-[9px] text-muted-foreground">ROI/E</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{it.nom}</div>
                <div className="text-[10px] text-muted-foreground truncate">{poleById.get(it.pole_id) || ""}</div>
                {it.justification_pareto && (
                  <div className="text-[11px] text-muted-foreground italic mt-0.5">« {it.justification_pareto} »</div>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>onActivate(it.id)}>Activer</Button>
                <button onClick={()=>onDelete(it.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="h-3 w-3"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ REVUE HEBDO PANEL ============
export type Revue = {
  id: string; semaine_debut: string; bilan: string;
  focus_semaine: string[]; alerte: string | null; created_at: string;
};

export function RevueHebdoPanel({ open, onClose, onGenerate, busy, revues }: {
  open: boolean; onClose: () => void; onGenerate: () => void; busy: boolean; revues: Revue[];
}) {
  if (!open) return null;
  return (
    <div className="fixed z-40 top-0 right-0 h-full w-full md:w-[420px] bg-background border-l border-border shadow-xl overflow-y-auto animate-in slide-in-from-right duration-200">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Revues hebdomadaires</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>
        </div>
        <Button onClick={onGenerate} disabled={busy} className="w-full">
          {busy ? <><Loader2 className="h-3 w-3 animate-spin mr-2"/>Génération…</> : "Générer la revue de cette semaine"}
        </Button>
        <div className="space-y-4">
          {revues.length === 0 && <div className="text-xs text-muted-foreground italic">Aucune revue encore.</div>}
          {revues.map(r => (
            <div key={r.id} className="border border-border p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Semaine du {new Date(r.semaine_debut).toLocaleDateString("fr-FR")}
              </div>
              <div className="text-sm whitespace-pre-wrap">{r.bilan}</div>
              {r.focus_semaine?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Focus</div>
                  <ul className="text-xs space-y-0.5">
                    {r.focus_semaine.map((f,i)=><li key={i}>· {f}</li>)}
                  </ul>
                </div>
              )}
              {r.alerte && (
                <div className="flex items-start gap-1.5 text-xs border-l-2 border-foreground pl-2 py-1 bg-muted/40">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0"/>
                  <span>{r.alerte}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ ANTI-STAGNATION BADGE ============
export function StagnationActions({
  projetId, onDecoupe, onBacklog, onAbandon, busy,
}: {
  projetId: string;
  onDecoupe: () => void; onBacklog: () => void; onAbandon: () => void; busy: boolean;
}) {
  return (
    <div className="border border-foreground p-2 space-y-2 bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs">
        <AlertTriangle className="h-3.5 w-3.5"/>
        <span className="font-medium">En pause depuis 7+ jours</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onDecoupe} disabled={busy}>
          <Scissors className="h-3 w-3 mr-1"/>Découper
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onBacklog} disabled={busy}>
          <Archive className="h-3 w-3 mr-1"/>Reporter au backlog
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAbandon} disabled={busy}>
          Abandonner
        </Button>
      </div>
    </div>
  );
}

export function StagnationBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border border-foreground rounded-sm ml-1">
      <AlertTriangle className="h-2.5 w-2.5"/>En pause ?
    </span>
  );
}

export function daysSince(iso: string | null): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

// ============ SUGGESTIONS IA CARDS (Pareto) ============
export type SuggestionPareto = {
  id: string; nom: string;
  score_roi_effort?: number | null;
  justification_pareto?: string | null;
  impact_etoile_polaire?: string | null;
  source?: "ia" | "backlog";
};

export function ParetoSuggestionsPanel({
  open, onClose, suggestions, onActivate,
}: {
  open: boolean; onClose: () => void;
  suggestions: SuggestionPareto[];
  onActivate?: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={(v)=>!v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Suggestions Pareto</DialogTitle>
          <DialogDescription>Top 20% impact/effort — calibrées sur tes débriefs et ton étoile polaire.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {suggestions.map(s => (
            <div key={s.id} className={cn(
              "border p-2.5 space-y-1.5",
              s.source === "backlog" ? "border-border bg-muted/30" : "border-foreground",
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium">{s.nom}</div>
                {s.score_roi_effort != null && (
                  <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 border border-border shrink-0">
                    {s.score_roi_effort}/10
                  </span>
                )}
              </div>
              {s.justification_pareto && (
                <div className="text-xs text-muted-foreground italic">« {s.justification_pareto} »</div>
              )}
              {s.impact_etoile_polaire && (
                <div className="text-xs flex items-start gap-1">
                  <Star className="h-3 w-3 mt-0.5 shrink-0"/>
                  <span>{s.impact_etoile_polaire}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {s.source === "backlog" ? "Backlog" : "IA"}
                </span>
                {s.source === "backlog" && onActivate && (
                  <Button size="sm" variant="outline" className="h-6 text-xs" onClick={()=>onActivate(s.id)}>Activer</Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

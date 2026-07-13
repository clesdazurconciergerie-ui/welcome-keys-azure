import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { X, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelProjet = {
  id: string;
  nom: string;
  objectif: string | null;
  statut: "a_faire" | "en_cours" | "fait" | "abandonne";
  priorite: string;
  difficulte: number;
  impact: number;
  automatisations: any;
  kpis: any;
  pole_id: string;
};
export type PanelAction = {
  id: string; projet_id: string; ordre: number;
  texte: string; fait: boolean; date: string | null;
};

const STATUT_LABELS: Record<string, string> = {
  a_faire: "À faire", en_cours: "En cours", fait: "Fait", abandonne: "Abandonné",
};

export default function ProjetSidePanel({
  projet, poleName, actions, onClose,
  onToggleAction, onAddAction, onDeleteAction, onChangeStatut,
}: {
  projet: PanelProjet;
  poleName: string;
  actions: PanelAction[];
  onClose: () => void;
  onToggleAction: (a: PanelAction) => void;
  onAddAction: (projetId: string, texte: string) => void;
  onDeleteAction: (id: string) => void;
  onChangeStatut: (statut: PanelProjet["statut"]) => void;
}) {
  const [newAction, setNewAction] = useState("");
  const [showAutos, setShowAutos] = useState(false);
  const [showKpis, setShowKpis] = useState(false);
  const done = actions.filter(a => a.fait).length;
  const total = actions.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const autos: string[] = Array.isArray(projet.automatisations) ? projet.automatisations : [];
  const kpis: string[] = Array.isArray(projet.kpis) ? projet.kpis : [];

  return (
    <div
      className={cn(
        "fixed z-40 bg-background border-l border-border shadow-xl overflow-y-auto",
        "top-0 right-0 h-full w-full md:w-[400px]",
        "animate-in slide-in-from-right duration-200"
      )}
    >
      <div className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{poleName}</div>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 border border-border rounded-sm">{projet.priorite}</span>
              <span className="text-[10px] px-1.5 py-0.5 border border-border rounded-sm">D{projet.difficulte}</span>
              <span className="text-[10px] px-1.5 py-0.5 border border-border rounded-sm">I{projet.impact}</span>
              <span className="text-[10px] px-1.5 py-0.5 border border-border rounded-sm">{STATUT_LABELS[projet.statut]}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4"/>
          </button>
        </div>

        <div>
          <h2 className="text-lg font-medium">{projet.nom}</h2>
          {projet.objectif && (
            <p className="text-sm text-muted-foreground mt-1">{projet.objectif}</p>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{done}/{total} actions</span><span>{pct}%</span>
          </div>
          <div className="h-1 bg-muted rounded-none overflow-hidden">
            <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }}/>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-1.5">
          {actions.sort((a,b)=>a.ordre-b.ordre).map(a => (
            <div key={a.id} className="flex items-start gap-2 group py-0.5">
              <Checkbox checked={a.fait} onCheckedChange={() => onToggleAction(a)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className={cn("text-sm", a.fait && "line-through text-muted-foreground")}>{a.texte}</div>
                {a.fait && a.date && (
                  <div className="text-[10px] text-muted-foreground">{new Date(a.date).toLocaleDateString("fr-FR")}</div>
                )}
              </div>
              <button
                onClick={() => onDeleteAction(a.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive mt-0.5"
              >
                <X className="h-3 w-3"/>
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Plus className="h-3 w-3 text-muted-foreground"/>
            <Input
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newAction.trim()) {
                  onAddAction(projet.id, newAction);
                  setNewAction("");
                }
              }}
              placeholder="Nouvelle action…"
              className="h-7 text-xs border-0 border-b rounded-none px-1 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Automatisations */}
        {autos.length > 0 && (
          <div>
            <button className="flex items-center gap-1 text-xs font-medium w-full py-1" onClick={() => setShowAutos(v => !v)}>
              {showAutos ? <ChevronDown className="h-3 w-3"/> : <ChevronRight className="h-3 w-3"/>}
              Automatisations ({autos.length})
            </button>
            {showAutos && (
              <ul className="mt-1 ml-4 space-y-0.5 text-xs text-muted-foreground">
                {autos.map((x,i)=><li key={i}>· {x}</li>)}
              </ul>
            )}
          </div>
        )}
        {kpis.length > 0 && (
          <div>
            <button className="flex items-center gap-1 text-xs font-medium w-full py-1" onClick={() => setShowKpis(v => !v)}>
              {showKpis ? <ChevronDown className="h-3 w-3"/> : <ChevronRight className="h-3 w-3"/>}
              KPI ({kpis.length})
            </button>
            {showKpis && (
              <ul className="mt-1 ml-4 space-y-0.5 text-xs text-muted-foreground">
                {kpis.map((x,i)=><li key={i}>· {x}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          {projet.statut !== "en_cours" && projet.statut !== "fait" && (
            <Button size="sm" variant="outline" onClick={() => onChangeStatut("en_cours")}>
              Passer en cours
            </Button>
          )}
          {projet.statut !== "abandonne" && projet.statut !== "fait" && (
            <Button size="sm" variant="outline" onClick={() => onChangeStatut("abandonne")}>
              Abandonner
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ArrowLeft, Star, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type TreePole = { id: string; numero: number; nom: string };
export type TreeProjet = {
  id: string;
  pole_id: string;
  nom: string;
  statut: "a_faire" | "en_cours" | "fait" | "abandonne" | "archive";
  recommande?: boolean;
  done: number;
  total: number;
};

function ProgressRing({ done, total, size = 28 }: { done: number; total: number; size?: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="2"/>
      {pct > 0 && (
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      )}
      <text x={size/2} y={size/2 + 3} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
        {done}/{total}
      </text>
    </svg>
  );
}

function MiniBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="h-0.5 w-full bg-muted overflow-hidden">
      <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CockpitTree({
  poles,
  projets,
  onSelectProjet,
  selectedProjetId,
}: {
  poles: TreePole[];
  projets: TreeProjet[];
  onSelectProjet: (id: string) => void;
  selectedProjetId: string | null;
}) {
  const [openPoleId, setOpenPoleId] = useState<string | null>(null);

  const projetsByPole = useMemo(() => {
    const m = new Map<string, TreeProjet[]>();
    for (const p of projets) {
      if (p.statut === "archive") continue;
      if (!m.has(p.pole_id)) m.set(p.pole_id, []);
      m.get(p.pole_id)!.push(p);
    }
    return m;
  }, [projets]);

  const sortedPoles = useMemo(() => [...poles].sort((a,b) => a.numero - b.numero), [poles]);

  const openPole = openPoleId ? poles.find(p => p.id === openPoleId) : null;
  const openPoleProjets = openPole ? (projetsByPole.get(openPole.id) || []) : [];

  const poleStats = (poleId: string) => {
    const list = projetsByPole.get(poleId) || [];
    const total = list.length;
    const done = list.filter(p => p.statut === "fait").length;
    return { total, done, allDone: total > 0 && done === total };
  };

  return (
    <div className="relative w-full h-full bg-background border border-border overflow-hidden flex flex-col">
      {/* Root */}
      <div className="flex justify-center pt-4 pb-2 shrink-0">
        <div className="border border-foreground bg-foreground text-background px-6 py-2 text-xs font-medium tracking-widest uppercase">
          Azur Keys
        </div>
      </div>

      {/* Connectors from root to grid (thin vertical line) */}
      <div className="flex justify-center shrink-0">
        <div className="w-px h-4 bg-border" />
      </div>

      {/* Grid 4 × 3 */}
      <div className="flex-1 min-h-0 p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 h-full auto-rows-fr">
          {sortedPoles.map((pole) => {
            const { done, total, allDone } = poleStats(pole.id);
            return (
              <button
                key={pole.id}
                onClick={() => setOpenPoleId(pole.id)}
                className={cn(
                  "flex flex-col justify-between text-left border border-border bg-background hover:border-foreground transition-colors p-2.5 min-h-[84px]",
                  allDone && "bg-muted/50",
                  openPoleId === pole.id && "border-foreground border-2",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-muted-foreground font-mono">{String(pole.numero).padStart(2, "0")}</div>
                    <div className="text-xs font-medium leading-tight line-clamp-2">{pole.nom}</div>
                  </div>
                  {allDone && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2}/>}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                    <span>{total} projet{total > 1 ? "s" : ""}</span>
                    <span>{done}/{total}</span>
                  </div>
                  <MiniBar done={done} total={total} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pole side panel */}
      {openPole && !selectedProjetId && (
        <div className="fixed top-0 right-0 h-full w-full md:w-[380px] bg-background border-l border-border shadow-xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Pôle {String(openPole.numero).padStart(2, "0")}
              </div>
              <div className="text-sm font-medium truncate">{openPole.nom}</div>
            </div>
            <button onClick={() => setOpenPoleId(null)} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4"/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {openPoleProjets.length === 0 && (
              <div className="text-xs text-muted-foreground italic p-4 text-center">Aucun projet dans ce pôle</div>
            )}
            {openPoleProjets.map(pr => {
              const isDone = pr.statut === "fait";
              const isAbandon = pr.statut === "abandonne";
              const isReco = !!pr.recommande && !isDone && !isAbandon;
              return (
                <button
                  key={pr.id}
                  onClick={() => onSelectProjet(pr.id)}
                  className={cn(
                    "w-full flex items-center gap-3 text-left border p-2.5 hover:border-foreground transition-colors bg-background",
                    isDone && "bg-muted/50",
                    isAbandon && "opacity-40",
                    isReco ? "border-foreground border-2" : "border-border",
                  )}
                >
                  <ProgressRing done={pr.done} total={pr.total} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-xs leading-tight line-clamp-2", isDone && "line-through")}>{pr.nom}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase">
                      {pr.statut === "en_cours" ? "En cours" : pr.statut === "fait" ? "Fait" : pr.statut === "abandonne" ? "Abandonné" : "À faire"}
                    </div>
                  </div>
                  {isReco && <Star className="h-3.5 w-3.5 fill-foreground text-foreground shrink-0"/>}
                  {isDone && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2}/>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

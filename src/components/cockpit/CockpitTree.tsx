import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Star, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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

const POLE_W = 200;
const POLE_H = 44;
const CARD_W = 176;
const CARD_H = 52;
const CARD_GAP = 8;
const POLE_X_STEP = 220;
const ROOT_Y = 30;
const POLE_Y = 130;
const CARDS_START_Y = POLE_Y + POLE_H + 30;

function poleColor(numero: number) {
  const h = (numero * 31) % 360;
  return `hsl(${h} 55% 55%)`;
}

function ProgressRing({ done, total, color, size = 22 }: { done: number; total: number; color: string; size?: number }) {
  const pct = total > 0 ? done / total : 0;
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="2"/>
      {pct > 0 && (
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="2" strokeLinecap="round"
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [zoom, setZoom] = useState(1);

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
  const totalWidth = Math.max(800, sortedPoles.length * POLE_X_STEP + 80);
  const maxProjets = Math.max(1, ...sortedPoles.map(p => collapsed[p.id] ? 0 : (projetsByPole.get(p.id)?.length || 0)));
  const totalHeight = CARDS_START_Y + maxProjets * (CARD_H + CARD_GAP) + 60;

  const rootX = totalWidth / 2;

  return (
    <div className="relative w-full h-full overflow-hidden bg-background border border-border">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-background/90 border border-border p-1">
        <button className="p-1 hover:bg-muted" onClick={() => setZoom(z => Math.min(2, z + 0.15))}><ZoomIn className="h-3.5 w-3.5"/></button>
        <button className="p-1 hover:bg-muted" onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}><ZoomOut className="h-3.5 w-3.5"/></button>
        <button className="p-1 hover:bg-muted" onClick={() => setZoom(1)}><Maximize2 className="h-3.5 w-3.5"/></button>
      </div>

      <div className="w-full h-full overflow-auto">
        <div style={{ width: totalWidth * zoom, height: totalHeight * zoom, position: "relative" }}>
          <svg
            width={totalWidth}
            height={totalHeight}
            style={{ position: "absolute", top: 0, left: 0, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
          >
            {/* Root → poles lines */}
            {sortedPoles.map((pole, idx) => {
              const px = 40 + idx * POLE_X_STEP + POLE_W / 2;
              return (
                <line key={`l-root-${pole.id}`}
                  x1={rootX} y1={ROOT_Y + 20}
                  x2={px} y2={POLE_Y}
                  stroke="hsl(var(--border))" strokeWidth="1"
                />
              );
            })}

            {/* Pole → project lines */}
            {sortedPoles.map((pole, idx) => {
              if (collapsed[pole.id]) return null;
              const list = projetsByPole.get(pole.id) || [];
              const px = 40 + idx * POLE_X_STEP + POLE_W / 2;
              return list.map((pr, i) => {
                const cy = CARDS_START_Y + i * (CARD_H + CARD_GAP) + CARD_H / 2;
                return (
                  <line key={`l-${pole.id}-${pr.id}`}
                    x1={px} y1={POLE_Y + POLE_H}
                    x2={px} y2={cy}
                    stroke="hsl(var(--border))" strokeWidth="1"
                  />
                );
              });
            })}

            {/* Root */}
            <rect x={rootX - 80} y={ROOT_Y} width={160} height={40} rx="0"
              fill="hsl(var(--foreground))" />
            <text x={rootX} y={ROOT_Y + 25} textAnchor="middle" fill="hsl(var(--background))"
              fontSize="13" fontWeight="600" fontFamily="Cinzel, serif">
              AZUR KEYS
            </text>
          </svg>

          {/* Poles + cards (as HTML overlay, absolutely positioned) */}
          <div style={{ position: "absolute", top: 0, left: 0, width: totalWidth, height: totalHeight, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
            {sortedPoles.map((pole, idx) => {
              const px = 40 + idx * POLE_X_STEP;
              const color = poleColor(pole.numero);
              const list = projetsByPole.get(pole.id) || [];
              const isCollapsed = collapsed[pole.id];
              return (
                <div key={pole.id}>
                  {/* Pole box */}
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [pole.id]: !c[pole.id] }))}
                    className="absolute flex items-center gap-1.5 px-2 border text-xs font-medium hover:opacity-90"
                    style={{
                      left: px, top: POLE_Y, width: POLE_W, height: POLE_H,
                      background: color, borderColor: color, color: "#fff",
                    }}
                  >
                    {isCollapsed ? <ChevronRight className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
                    <span className="opacity-80 text-[10px]">{pole.numero}.</span>
                    <span className="truncate text-left flex-1">{pole.nom}</span>
                    <span className="opacity-80 text-[10px]">{list.length}</span>
                  </button>

                  {/* Project cards */}
                  {!isCollapsed && list.map((pr, i) => {
                    const y = CARDS_START_Y + i * (CARD_H + CARD_GAP);
                    const isDone = pr.statut === "fait";
                    const isAbandon = pr.statut === "abandonne";
                    const isReco = !!pr.recommande && !isDone && !isAbandon;
                    const isSel = selectedProjetId === pr.id;
                    return (
                      <button
                        key={pr.id}
                        onClick={() => onSelectProjet(pr.id)}
                        className={cn(
                          "absolute flex items-center gap-2 px-2 border-2 text-left text-xs bg-background hover:bg-muted/40 transition-colors",
                          isSel && "ring-2 ring-foreground ring-offset-1",
                          isAbandon && "opacity-40",
                        )}
                        style={{
                          left: px + (POLE_W - CARD_W) / 2, top: y,
                          width: CARD_W, height: CARD_H,
                          borderColor: isReco ? "#eab308"
                            : isDone ? "hsl(142 71% 45%)"
                            : pr.statut === "en_cours" ? color
                            : "hsl(var(--border))",
                          background: isDone ? "hsl(142 71% 45% / 0.15)" : undefined,
                        }}
                      >
                        <ProgressRing done={pr.done} total={pr.total} color={color}/>
                        <span className={cn("flex-1 line-clamp-2 leading-tight", isDone && "line-through")}>{pr.nom}</span>
                        {isReco && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0"/>}
                        {isDone && <span className="text-green-600 shrink-0">✓</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

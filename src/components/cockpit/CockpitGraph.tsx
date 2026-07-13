import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

export type GraphProjet = {
  id: string;
  pole_id: string;
  nom: string;
  statut: "a_faire" | "en_cours" | "fait" | "abandonne";
  priorite: string;
  recommande?: boolean;
  done: number;
  total: number;
};
export type GraphPole = { id: string; numero: number; nom: string };

type NodeDatum = {
  id: string;
  kind: "root" | "pole" | "projet";
  label: string;
  projet?: GraphProjet;
  pole?: GraphPole;
  poleAdvance?: number; // 0..1 (share of projects fait)
  x?: number; y?: number; fx?: number; fy?: number;
};
type LinkDatum = { source: string; target: string };

const COLOR_BG = "#1a1a1a";
const COLOR_TEXT = "#e5e5e5";
const COLOR_MUTED = "#6b6b6b";
const COLOR_DONE = "#22c55e";
const COLOR_HALO = "#eab308";
const COLOR_LINK = "rgba(180,180,180,0.28)";

function lerpColor(a: [number, number, number], b: [number, number, number], t: number) {
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export default function CockpitGraph({
  poles,
  projets,
  onSelectProjet,
  selectedProjetId,
}: {
  poles: GraphPole[];
  projets: GraphProjet[];
  onSelectProjet: (id: string) => void;
  selectedProjetId: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current!.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Pulse ticker for halos
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setPulse((p) => (p + 0.03) % (Math.PI * 2));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const { nodes, links } = useMemo(() => {
    const poleAdvanceById = new Map<string, number>();
    for (const pole of poles) {
      const list = projets.filter((p) => p.pole_id === pole.id && p.statut !== "abandonne");
      const done = list.filter((p) => p.statut === "fait").length;
      poleAdvanceById.set(pole.id, list.length ? done / list.length : 0);
    }
    const nodes: NodeDatum[] = [
      { id: "__root__", kind: "root", label: "Azur Keys" },
      ...poles.map<NodeDatum>((p) => ({
        id: p.id, kind: "pole", label: p.nom, pole: p,
        poleAdvance: poleAdvanceById.get(p.id) ?? 0,
      })),
      ...projets.map<NodeDatum>((pr) => ({
        id: pr.id, kind: "projet", label: pr.nom, projet: pr,
      })),
    ];
    const links: LinkDatum[] = [
      ...poles.map((p) => ({ source: "__root__", target: p.id })),
      ...projets.map((pr) => ({ source: pr.pole_id, target: pr.id })),
    ];
    return { nodes, links };
  }, [poles, projets]);

  const drawNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as NodeDatum & { x: number; y: number };
    if (n.kind === "root") {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#d4d4d8";
      ctx.fill();
      ctx.font = `600 ${12 / globalScale + 4}px Inter, sans-serif`;
      ctx.fillStyle = COLOR_TEXT;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(n.label, n.x, n.y + 18);
      return;
    }
    if (n.kind === "pole") {
      const adv = n.poleAdvance ?? 0;
      const color = lerpColor([100, 100, 105], [34, 197, 94], adv);
      ctx.beginPath();
      ctx.arc(n.x, n.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
      // label toujours visible
      const fs = Math.max(10, 11 / globalScale);
      ctx.font = `500 ${fs}px Inter, sans-serif`;
      ctx.fillStyle = COLOR_TEXT;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`${n.pole!.numero}. ${n.label}`, n.x, n.y + 12);
      return;
    }
    // projet
    const pr = n.projet!;
    const r = 6;
    const isDone = pr.statut === "fait";
    const isAbandon = pr.statut === "abandonne";
    const pct = pr.total > 0 ? pr.done / pr.total : (pr.statut === "en_cours" ? 0.3 : 0);

    // Halo doré pulsant si recommandé
    if (pr.recommande && !isDone && !isAbandon) {
      const puls = 1 + Math.sin(pulse) * 0.18;
      const g = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r * 3.2 * puls);
      g.addColorStop(0, "rgba(234,179,8,0.55)");
      g.addColorStop(1, "rgba(234,179,8,0)");
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 3.2 * puls, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // Selection ring
    if (selectedProjetId === pr.id) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.globalAlpha = isAbandon ? 0.3 : 1;

    if (isDone) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_DONE;
      ctx.fill();
    } else {
      // contour
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = isAbandon ? COLOR_MUTED : "#d4d4d8";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // arc progression
      if (pct > 0 && pct < 1) {
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        const start = -Math.PI / 2;
        ctx.arc(n.x, n.y, r - 0.5, start, start + Math.PI * 2 * pct);
        ctx.closePath();
        ctx.fillStyle = "rgba(34,197,94,0.75)";
        ctx.fill();
      } else if (pct >= 1) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r - 0.5, 0, Math.PI * 2);
        ctx.fillStyle = COLOR_DONE;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // label visible au zoom élevé ou survol → ici affichage si globalScale > 1.4
    if (globalScale > 1.4) {
      const fs = Math.max(9, 10 / globalScale);
      ctx.font = `400 ${fs}px Inter, sans-serif`;
      ctx.fillStyle = COLOR_MUTED;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(pr.nom, n.x, n.y + r + 2);
    }
  };

  return (
    <div ref={wrapRef} className="w-full h-full" style={{ background: COLOR_BG }}>
      <ForceGraph2D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={{ nodes: nodes as any, links: links as any }}
        backgroundColor={COLOR_BG}
        linkColor={() => COLOR_LINK}
        linkWidth={0.6}
        nodeLabel={(n: any) => (n.kind === "projet" ? n.label : "")}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          const r = node.kind === "root" ? 14 : node.kind === "pole" ? 10 : 8;
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fill();
        }}
        onNodeClick={(n: any) => {
          if (n.kind === "projet") onSelectProjet(n.id);
        }}
        cooldownTicks={120}
        d3AlphaDecay={0.03}
        enableNodeDrag={true}
      />
    </div>
  );
}

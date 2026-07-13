// Parse un markdown structuré vers une liste de projets
export type ParsedProjet = {
  nom: string;
  objectif?: string;
  actions: string[];
  automatisations: string[];
  kpis: string[];
  priorite: "P1" | "P2" | "P3" | "P4";
  difficulte: number;
  impact: number;
};

export function parseMarkdownProjets(markdown: string): ParsedProjet[] {
  const projets: ParsedProjet[] = [];
  const lines = markdown.split(/\r?\n/);
  let current: ParsedProjet | null = null;
  let section: "actions" | "automatisations" | "kpis" | "objectif" | null = null;

  const push = () => {
    if (current) projets.push(current);
    current = null;
    section = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Nouveau projet
    const projMatch = line.match(/^###\s+(?:Projet\s*:\s*)?(.+)$/i);
    if (projMatch) {
      push();
      current = {
        nom: projMatch[1].trim(),
        actions: [], automatisations: [], kpis: [],
        priorite: "P3", difficulte: 3, impact: 3,
      };
      continue;
    }

    if (!current) continue;

    // Ligne meta : > P1 · Difficulté 2/5 · Impact 5/5
    if (line.startsWith(">")) {
      const meta = line.replace(/^>\s*/, "");
      const prio = meta.match(/\bP([1-4])\b/);
      if (prio) current.priorite = `P${prio[1]}` as any;
      const diff = meta.match(/Difficult[ée]\s*(\d)\s*\/\s*5/i);
      if (diff) current.difficulte = parseInt(diff[1]);
      const imp = meta.match(/Impact\s*(\d)\s*\/\s*5/i);
      if (imp) current.impact = parseInt(imp[1]);
      continue;
    }

    // Sections
    const sec = line.match(/^\*?\*?(Objectif|Actions?|Automatisations?|KPI[s]?)\*?\*?\s*:?\s*(.*)$/i);
    if (sec) {
      const name = sec[1].toLowerCase();
      if (name.startsWith("obj")) section = "objectif";
      else if (name.startsWith("action")) section = "actions";
      else if (name.startsWith("auto")) section = "automatisations";
      else if (name.startsWith("kpi")) section = "kpis";
      const rest = sec[2]?.trim();
      if (rest) {
        if (section === "objectif") current.objectif = rest;
      }
      continue;
    }

    // Liste
    const item = line.match(/^[-*•]\s+(.+)$/);
    if (item && section && section !== "objectif") {
      (current[section] as string[]).push(item[1].trim());
      continue;
    }
    if (section === "objectif" && !current.objectif) {
      current.objectif = line;
    }
  }
  push();
  return projets;
}

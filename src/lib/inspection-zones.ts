// MODULE — Référentiel des zones, catégories et niveaux d'anomalie des états des lieux

export interface ZoneDef {
  key: string;
  label: string;
  hint: string;
}

export const INSPECTION_ZONES: ZoneDef[] = [
  { key: "entrance", label: "Entrée", hint: "Porte, serrure, interphone, sol" },
  { key: "living", label: "Séjour", hint: "Mobilier, TV, propreté, murs" },
  { key: "kitchen", label: "Cuisine", hint: "Électroménager, vaisselle, plan de travail" },
  { key: "bedrooms", label: "Chambre(s)", hint: "Literie, rangements, rideaux" },
  { key: "bathroom", label: "Salle de bain / WC", hint: "Sanitaires, robinetterie, linge" },
  { key: "outdoor", label: "Extérieur", hint: "Terrasse, balcon, jardin (si applicable)" },
  { key: "keys", label: "Clés et accès", hint: "Jeux de clés, badges, codes" },
];

export const ZONE_LABEL: Record<string, string> = Object.fromEntries(
  INSPECTION_ZONES.map((z) => [z.key, z.label]),
);

export type ZoneStatus = "pending" | "ok" | "issue" | "skipped";

export const ZONE_STATUS_LABEL: Record<ZoneStatus, string> = {
  pending: "À contrôler",
  ok: "Conforme",
  issue: "Problème signalé",
  skipped: "Non applicable",
};

export const ISSUE_CATEGORIES = [
  { value: "cleanliness", label: "Propreté" },
  { value: "damage", label: "Casse" },
  { value: "missing", label: "Manque" },
  { value: "malfunction", label: "Dysfonctionnement" },
  { value: "other", label: "Autre" },
] as const;

export const ISSUE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  ISSUE_CATEGORIES.map((c) => [c.value, c.label]),
);

export const ISSUE_SEVERITIES = [
  { value: "minor", label: "Mineur" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
] as const;

export const ISSUE_SEVERITY_LABEL: Record<string, string> = Object.fromEntries(
  ISSUE_SEVERITIES.map((s) => [s.value, s.label]),
);

export const INSPECTION_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  in_progress: "Brouillon",
  to_sign: "À signer",
  completed: "À signer",
  validated: "Finalisé",
};

export const INSPECTION_TYPE_LABEL: Record<string, string> = {
  entry: "Entrée",
  exit: "Sortie",
  inventory: "Inventaire",
  maintenance: "Maintenance",
};

/** Devine la zone associée à une photo de ménage à partir de son type/kind. */
export function guessZoneFromKind(kind?: string | null): string | null {
  if (!kind) return null;
  const k = kind.toLowerCase();
  if (/(entr|hall|couloir|porte)/.test(k)) return "entrance";
  if (/(salon|s[ée]jour|living)/.test(k)) return "living";
  if (/(cuisine|kitchen|frigo|four)/.test(k)) return "kitchen";
  if (/(chambre|lit|bedroom|literie)/.test(k)) return "bedrooms";
  if (/(bain|douche|wc|sdb|toilette|bathroom)/.test(k)) return "bathroom";
  if (/(terrasse|balcon|jardin|ext[ée]rieur|piscine)/.test(k)) return "outdoor";
  if (/(cl[ée]|key|badge|boite|coffre)/.test(k)) return "keys";
  return null;
}

export function buildInspectionReference(type: string, date: string, seed: string) {
  const t = type === "exit" ? "S" : "E";
  const d = date.replace(/-/g, "").slice(2);
  return `EDL-${t}${d}-${seed.slice(0, 4).toUpperCase()}`;
}

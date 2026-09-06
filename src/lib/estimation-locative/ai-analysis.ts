// MODULE — Estimation locative · COUCHE D'ANALYSE (étape 3)
// ─────────────────────────────────────────────────────────────────────────────
// L'IA observe, elle ne décide jamais du prix : ce fichier normalise ses sorties,
// les confronte aux données saisies et aux données RDNA, détecte les conflits,
// applique la hiérarchie des sources et prépare les entrées du moteur (étape 2).
//
// RÈGLE ABSOLUE : "non observable" n'est JAMAIS transformé en "absent".
// ─────────────────────────────────────────────────────────────────────────────

/* ───────────────────────────── sources et hiérarchie (§20) ───────────────────────────── */

export type SourceKind = "MANUAL" | "USER" | "RDNA" | "WEB" | "AI" | "CALCULATED";

/** MANUAL > USER > VERIFIED EXTERNAL (RDNA/WEB) > AI > CALCULATED */
export const SOURCE_PRIORITY: Record<SourceKind, number> = {
  MANUAL: 5, USER: 4, RDNA: 3, WEB: 3, AI: 2, CALCULATED: 1,
};

export const SOURCE_LABEL_FR: Record<SourceKind, string> = {
  MANUAL: "Correction manuelle",
  USER: "Saisie",
  RDNA: "Rapport RDNA",
  WEB: "Données géographiques",
  AI: "Analyse IA",
  CALCULATED: "Calculé",
};

/** État d'une caractéristique. `not_observable` ≠ `absent` (§3, §13). */
export type Observability = "present" | "absent" | "not_observable" | "unknown";

export interface Observation<T = unknown> {
  value: T | null;
  source: SourceKind;
  /** 0 → 1. `null` quand la notion n'a pas de sens (saisie humaine = 1). */
  confidence: number | null;
  status: Observability;
  rationale?: string | null;
}

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export function confidenceBand(c: number | null | undefined): ConfidenceBand {
  if (c === null || c === undefined || Number.isNaN(c)) return "UNKNOWN";
  if (c >= 0.75) return "HIGH";
  if (c >= 0.45) return "MEDIUM";
  return "LOW";
}

/* ───────────────────────────── normalisation des valeurs ───────────────────────────── */

const txt = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clampScore = (v: unknown): number | null =>
  isNum(v) ? Math.round(Math.min(100, Math.max(0, v))) : null;

const UNKNOWN_WORDS = [
  "unknown", "inconnu", "inconnue", "non observable", "non-observable", "not observable",
  "non visible", "indéterminé", "indetermine", "n/a", "na", "non renseigné", "non renseigne",
];

/** true si la chaîne exprime une absence d'information (et non une absence de l'équipement). */
export function isUnknownValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (isNum(v)) return false;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return v.length === 0;
  const s = txt(v);
  if (!s) return true;
  return UNKNOWN_WORDS.some((w) => s === w || s.includes(w));
}

export type PoolKind = "privee" | "commune" | "aucune";
export function normalizePool(v: unknown): PoolKind | null {
  if (isUnknownValue(v)) return null;
  const s = txt(v);
  if (s.includes("privé") || s.includes("prive") || s.includes("private")) return "privee";
  if (s.includes("commun") || s.includes("shared") || s.includes("résidence") || s.includes("residence")) return "commune";
  if (s.includes("aucune") || s.includes("pas de piscine") || s.includes("sans piscine") || s === "non" || s === "no") return "aucune";
  if (s.includes("piscine") || s.includes("pool")) return "commune";
  return null;
}

export type ViewKind = "panoramique" | "partielle" | "degagee" | "aucune";
export function normalizeView(v: unknown): ViewKind | null {
  if (isUnknownValue(v)) return null;
  const s = txt(v);
  if (s.includes("panoram")) return "panoramique";
  if (s.includes("partiel") || s.includes("partial") || s.includes("aperçu") || s.includes("apercu")) return "partielle";
  if (s.includes("aucune") || s.includes("vis-à-vis") || s.includes("vis a vis") || s === "non") return "aucune";
  if (s.includes("mer") || s.includes("sea")) return "partielle";
  if (["jardin", "piscine", "montagne", "ville", "verdure", "dégagée", "degagee"].some((k) => s.includes(k))) return "degagee";
  return null;
}

export type ParkingKind = "garage" | "prive" | "rue" | "aucun";
export function normalizeParking(v: unknown): ParkingKind | null {
  if (isUnknownValue(v)) return null;
  const s = txt(v);
  if (s.includes("garage") || s.includes("box")) return "garage";
  if (s.includes("privé") || s.includes("prive") || s.includes("private") || s.includes("résidence") || s.includes("residence")) return "prive";
  if (s.includes("rue") || s.includes("street") || s.includes("public")) return "rue";
  if (s.includes("aucun") || s.includes("sans parking") || s === "non") return "aucun";
  return null;
}

export type AcKind = "totale" | "partielle" | "aucune";
export function normalizeAc(v: unknown): AcKind | null {
  if (isUnknownValue(v)) return null;
  const s = txt(v);
  if (s.includes("toutes") || s.includes("complète") || s.includes("complete") || s === "oui" || s === "yes") return "totale";
  if (s.includes("certaines") || s.includes("partiel") || s.includes("salon")) return "partielle";
  if (s.includes("aucune") || s.includes("pas de clim") || s === "non" || s === "no") return "aucune";
  return null;
}

const NORMALIZERS: Record<string, (v: unknown) => string | number | null> = {
  piscine: normalizePool,
  vue: normalizeView,
  parking: normalizeParking,
  climatisation: normalizeAc,
};

function normalizeFact(key: string, value: unknown): string | number | null {
  const n = NORMALIZERS[key];
  if (n) return n(value);
  if (isUnknownValue(value)) return null;
  if (isNum(value)) return value;
  const s = txt(value);
  return s || null;
}

/* ───────────────────────────── sortie brute de l'IA (§2, §4) ───────────────────────────── */

export interface AiFeatureObservation {
  /** ex. "piscine", "vue", "parking", "climatisation", "chambres" */
  key: string;
  value: unknown;
  status: Observability;
  confidence: number | null;
  rationale?: string | null;
}

export interface AiPhotoScore {
  photo_id: string;
  category?: string | null;
  aesthetic: number | null;
  technical: number | null;
  importance: number | null;
  usable: boolean;
  note?: string | null;
}

export interface AiQualitativeItem {
  label: string;
  rationale?: string | null;
  evidence?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  impact?: string | null;
}

export interface AiAnalysisPayload {
  version: string;
  analyzed_at: string;
  photos_analyzed: number;
  photos_failed: number;
  /** Scores de synthèse consommés par le moteur (§7, §23). */
  scores: {
    STANDING_SCORE: number | null;
    PROPERTY_CONDITION_SCORE: number | null;
    DESIGN_SCORE: number | null;
    EQUIPMENT_QUALITY_SCORE: number | null;
    VISUAL_APPEAL_SCORE: number | null;
    PHOTO_QUALITY_SCORE: number | null;
    PHOTO_COVERAGE_SCORE: number | null;
  };
  photo_quality: {
    luminosite: number | null;
    cadrage: number | null;
    nettete: number | null;
    coherence: number | null;
    couverture_pieces: string[];
    pieces_manquantes: string[];
  };
  photo_scores: AiPhotoScore[];
  features: AiFeatureObservation[];
  strengths: AiQualitativeItem[];
  weaknesses: AiQualitativeItem[];
  usp: AiQualitativeItem[];
  recommendations: AiQualitativeItem[];
  positioning: { label: string | null; confidence: number | null; rationale?: string | null };
  target: { primary: string | null; secondary: string[]; rationale?: string | null };
  summary: {
    positionnement?: string | null;
    standing?: string | null;
    potentiel_locatif?: string | null;
    points_a_ameliorer?: string[];
    risques?: string[];
  };
  global_confidence: number | null;
  /** Erreurs partielles (lots de photos échoués) — l'analyse reste exploitable. */
  errors: string[];
}

export const POSITIONING_LABELS = [
  "Entrée de marché", "Standard", "Supérieur", "Premium", "Très premium",
] as const;

const asArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const asStr = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
};
const asConf = (v: unknown): number | null => {
  if (!isNum(v)) return null;
  return Math.round(clamp01(v > 1 ? v / 100 : v) * 100) / 100;
};

function normalizeStatus(raw: unknown, value: unknown): Observability {
  const s = txt(raw);
  if (s === "present" || s === "présent") return "present";
  if (s === "absent") return "absent";
  if (s === "not_observable" || s === "non observable" || s === "non_observable") return "not_observable";
  if (s === "unknown" || s === "inconnu") return "unknown";
  // Sans statut explicite : une valeur vide ne veut PAS dire absent (§3).
  return isUnknownValue(value) ? "not_observable" : "present";
}

function normalizeQualitative(raw: unknown, opts: { requireRationale: boolean }): AiQualitativeItem[] {
  return asArray(raw)
    .map((it) => {
      if (typeof it === "string") return { label: it.trim(), rationale: null } as AiQualitativeItem;
      const label = asStr(it?.label) ?? asStr(it?.titre) ?? asStr(it?.text);
      if (!label) return null;
      const prio = txt(it?.priority ?? it?.priorite);
      return {
        label,
        rationale: asStr(it?.rationale) ?? asStr(it?.justification) ?? asStr(it?.raison),
        evidence: asStr(it?.evidence) ?? asStr(it?.preuve),
        priority: prio === "high" ? "HIGH" : prio === "low" ? "LOW" : prio === "medium" ? "MEDIUM" : undefined,
        impact: asStr(it?.impact),
      } as AiQualitativeItem;
    })
    .filter((it): it is AiQualitativeItem => !!it)
    // §8 : jamais de faiblesse (ni d'USP) non justifiée par une observation.
    .filter((it) => (opts.requireRationale ? !!(it.rationale || it.evidence) : true));
}

/** Normalise la réponse brute du modèle en payload sûr. Rien n'est inventé ici. */
export function normalizeAiPayload(
  raw: any,
  meta: { photos_analyzed: number; photos_failed: number; errors?: string[] },
): AiAnalysisPayload {
  const s = raw?.scores ?? {};
  const q = raw?.photo_quality ?? {};
  const posLabel = asStr(raw?.positioning?.label);
  return {
    version: "ai-analysis-1",
    analyzed_at: new Date().toISOString(),
    photos_analyzed: meta.photos_analyzed,
    photos_failed: meta.photos_failed,
    scores: {
      STANDING_SCORE: clampScore(s.STANDING_SCORE ?? s.standing),
      PROPERTY_CONDITION_SCORE: clampScore(s.PROPERTY_CONDITION_SCORE ?? s.condition ?? s.etat),
      DESIGN_SCORE: clampScore(s.DESIGN_SCORE ?? s.design),
      EQUIPMENT_QUALITY_SCORE: clampScore(s.EQUIPMENT_QUALITY_SCORE ?? s.equipements),
      VISUAL_APPEAL_SCORE: clampScore(s.VISUAL_APPEAL_SCORE ?? s.visual_appeal),
      PHOTO_QUALITY_SCORE: clampScore(s.PHOTO_QUALITY_SCORE ?? s.photo_quality),
      PHOTO_COVERAGE_SCORE: clampScore(s.PHOTO_COVERAGE_SCORE ?? s.photo_coverage),
    },
    photo_quality: {
      luminosite: clampScore(q.luminosite),
      cadrage: clampScore(q.cadrage),
      nettete: clampScore(q.nettete),
      coherence: clampScore(q.coherence),
      couverture_pieces: asArray(q.couverture_pieces).map(String),
      pieces_manquantes: asArray(q.pieces_manquantes).map(String),
    },
    photo_scores: asArray(raw?.photo_scores)
      .map((p) => ({
        photo_id: String(p?.photo_id ?? ""),
        category: asStr(p?.category) ?? asStr(p?.categorie),
        aesthetic: clampScore(p?.aesthetic ?? p?.esthetique),
        technical: clampScore(p?.technical ?? p?.technique),
        importance: clampScore(p?.importance),
        usable: p?.usable !== false,
        note: asStr(p?.note),
      }))
      .filter((p) => p.photo_id),
    features: asArray(raw?.features)
      .map((f) => {
        const key = asStr(f?.key)?.toLowerCase();
        if (!key) return null;
        const status = normalizeStatus(f?.status, f?.value);
        return {
          key,
          // Une caractéristique non observée n'a pas de valeur — surtout pas "absent".
          value: status === "present" ? f?.value ?? null : status === "absent" ? f?.value ?? "aucun" : null,
          status,
          confidence: asConf(f?.confidence),
          rationale: asStr(f?.rationale) ?? asStr(f?.justification),
        } as AiFeatureObservation;
      })
      .filter((f): f is AiFeatureObservation => !!f),
    strengths: normalizeQualitative(raw?.strengths ?? raw?.forces, { requireRationale: false }),
    weaknesses: normalizeQualitative(raw?.weaknesses ?? raw?.faiblesses, { requireRationale: true }),
    usp: normalizeQualitative(raw?.usp, { requireRationale: true }).slice(0, 7),
    recommendations: normalizeQualitative(raw?.recommendations, { requireRationale: true }),
    positioning: {
      label: posLabel && (POSITIONING_LABELS as readonly string[]).includes(posLabel) ? posLabel : posLabel,
      confidence: asConf(raw?.positioning?.confidence),
      rationale: asStr(raw?.positioning?.rationale),
    },
    target: {
      primary: asStr(raw?.target?.primary),
      secondary: asArray(raw?.target?.secondary).map(String),
      rationale: asStr(raw?.target?.rationale),
    },
    summary: {
      positionnement: asStr(raw?.summary?.positionnement),
      standing: asStr(raw?.summary?.standing),
      potentiel_locatif: asStr(raw?.summary?.potentiel_locatif),
      points_a_ameliorer: asArray(raw?.summary?.points_a_ameliorer).map(String),
      risques: asArray(raw?.summary?.risques).map(String),
    },
    global_confidence: asConf(raw?.global_confidence),
    errors: meta.errors ?? [],
  };
}

/* ───────────────────────────── résolution des faits (§19, §20, §25) ───────────────────────────── */

export interface ResolvedFact {
  key: string;
  label: string;
  /** Valeur normalisée retenue (celle que verra le moteur). */
  value: string | number | null;
  /** Valeur brute retenue, telle que saisie ou observée. */
  raw: unknown;
  source: SourceKind;
  confidence: number | null;
  status: Observability;
  rationale?: string | null;
  candidates: { source: SourceKind; value: string | number | null; raw: unknown; confidence: number | null; status: Observability }[];
  conflict: null | { user: string | number | null; ai: string | number | null; message: string };
}

export const FACT_LABELS: Record<string, string> = {
  chambres: "Chambres",
  salles_de_bain: "Salles de bain",
  couchages: "Couchages",
  surface_interieure_m2: "Surface intérieure",
  piscine: "Piscine",
  parking: "Parking",
  vue: "Vue",
  climatisation: "Climatisation",
  exterieurs: "Extérieurs",
  wifi: "Wifi",
  type: "Type de logement",
};

const FACT_KEYS = Object.keys(FACT_LABELS);

const sameValue = (a: unknown, b: unknown) =>
  a === b || (isNum(a) && isNum(b) && Math.abs(a - b) < 1e-9);

/**
 * Applique la hiérarchie MANUAL > USER > RDNA > AI et signale les conflits.
 * La donnée utilisateur gagne toujours contre l'IA, mais le conflit reste visible.
 */
export function resolveFacts(input: {
  features?: Record<string, unknown> | null;
  ai?: AiAnalysisPayload | null;
  rdna?: Record<string, unknown> | null;
  overrides?: Record<string, { value?: unknown } | unknown> | null;
}): ResolvedFact[] {
  const features = input.features ?? {};
  const rdna = input.rdna ?? {};
  const overrides = (input.overrides ?? {}) as Record<string, any>;
  const aiByKey = new Map<string, AiFeatureObservation>();
  for (const f of input.ai?.features ?? []) if (!aiByKey.has(f.key)) aiByKey.set(f.key, f);

  const keys = Array.from(new Set([...FACT_KEYS, ...aiByKey.keys()]));

  return keys.map((key) => {
    const label = FACT_LABELS[key] ?? key;
    const candidates: ResolvedFact["candidates"] = [];

    const ov = overrides[`fact.${key}`];
    if (ov !== undefined && ov !== null) {
      const rawVal = typeof ov === "object" && "value" in (ov as any) ? (ov as any).value : ov;
      if (!isUnknownValue(rawVal)) {
        candidates.push({ source: "MANUAL", value: normalizeFact(key, rawVal), raw: rawVal, confidence: 1, status: "present" });
      }
    }

    const userVal = (features as any)[key];
    if (!isUnknownValue(userVal) && !(Array.isArray(userVal) && userVal.length === 0)) {
      const norm = normalizeFact(key, Array.isArray(userVal) ? userVal.join(", ") : userVal);
      candidates.push({
        source: "USER",
        value: norm,
        raw: userVal,
        confidence: 1,
        status: norm === "aucune" || norm === "aucun" ? "absent" : "present",
      });
    }

    const rdnaVal = (rdna as any)[key];
    if (!isUnknownValue(rdnaVal)) {
      candidates.push({ source: "RDNA", value: normalizeFact(key, rdnaVal), raw: rdnaVal, confidence: 0.8, status: "present" });
    }

    const aiObs = aiByKey.get(key);
    if (aiObs) {
      const aiNorm = aiObs.status === "present" ? normalizeFact(key, aiObs.value) : null;
      candidates.push({
        source: "AI",
        value: aiObs.status === "absent" ? normalizeFact(key, aiObs.value) ?? "aucun" : aiNorm,
        raw: aiObs.value,
        confidence: aiObs.confidence,
        status: aiObs.status,
      });
    }

    candidates.sort((a, b) => SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]);
    const winner = candidates.find((c) => c.status !== "not_observable" && c.status !== "unknown") ?? candidates[0];

    // Conflit utilisateur ↔ IA : les deux affirment une valeur, mais différente.
    const user = candidates.find((c) => c.source === "USER" || c.source === "MANUAL");
    const ai = candidates.find((c) => c.source === "AI");
    let conflict: ResolvedFact["conflict"] = null;
    if (
      user && ai && ai.status !== "not_observable" && ai.status !== "unknown" &&
      user.value !== null && ai.value !== null && !sameValue(user.value, ai.value)
    ) {
      conflict = {
        user: user.value, ai: ai.value,
        message: `${label} : la saisie indique « ${user.value} », l'analyse des photos indique « ${ai.value} ». La saisie fait foi.`,
      };
    }

    return {
      key, label,
      value: winner?.value ?? null,
      raw: winner?.raw ?? null,
      source: winner?.source ?? "AI",
      confidence: winner?.confidence ?? null,
      status: winner?.status ?? "unknown",
      rationale: aiObs?.rationale ?? null,
      candidates, conflict,
    };
  });
}

/** Caractéristiques résolues remises au format `features` attendu par le moteur (§23). */
export function factsToFeatures(
  base: Record<string, unknown> | null | undefined,
  facts: ResolvedFact[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(base ?? {}) };
  for (const f of facts) {
    if (f.status === "not_observable" || f.status === "unknown") continue; // reste UNKNOWN
    if (f.value === null) continue;
    if (f.source === "AI" && !isUnknownValue((base ?? {})[f.key])) continue; // la saisie prime
    out[f.key] = f.raw ?? f.value;
  }
  return out;
}

/** Scores IA au format attendu par le moteur de l'étape 2 (aucune formule modifiée). */
export function toEngineAiScores(ai: AiAnalysisPayload | null | undefined) {
  const s = ai?.scores;
  if (!s) return {};
  return {
    standing: s.STANDING_SCORE,
    etat: s.PROPERTY_CONDITION_SCORE,
    design: s.DESIGN_SCORE,
    equipements: s.EQUIPMENT_QUALITY_SCORE,
    qualite_percue: s.VISUAL_APPEAL_SCORE,
  };
}

/* ───────────────────────────── comparaison au marché (§14) ───────────────────────────── */

export interface MarketComparisonItem {
  key: string;
  label: string;
  property: string | number | null;
  market_penetration_pct: number | null;
  verdict: "differenciant" | "standard_du_marche" | "manque" | "inconnu";
  message: string;
}

/** Confronte les caractéristiques résolues au taux d'équipement du marché RDNA. */
export function compareToMarket(
  facts: ResolvedFact[],
  penetration: Record<string, number> | null | undefined,
): MarketComparisonItem[] {
  const pen = penetration ?? {};
  const out: MarketComparisonItem[] = [];
  for (const f of facts) {
    const p = pen[f.key];
    const pctVal = isNum(p) ? (p <= 1 ? Math.round(p * 100) : Math.round(p)) : null;
    if (f.status === "not_observable" || f.status === "unknown") {
      out.push({
        key: f.key, label: f.label, property: null, market_penetration_pct: pctVal,
        verdict: "inconnu",
        message: `${f.label} : information non disponible, aucune conclusion tirée.`,
      });
      continue;
    }
    if (pctVal === null) continue;
    const absent = f.value === "aucun" || f.value === "aucune" || f.status === "absent";
    // Le type compte : piscine privée ≠ piscine commune, vue panoramique ≠ vue partielle.
    const premium = f.value === "privee" || f.value === "panoramique" || f.value === "garage" || f.value === "prive";
    if (absent) {
      out.push({
        key: f.key, label: f.label, property: f.value, market_penetration_pct: pctVal,
        verdict: pctVal >= 60 ? "manque" : "standard_du_marche",
        message: pctVal >= 60
          ? `${f.label} : absent alors que ${pctVal} % du marché local en dispose.`
          : `${f.label} : absent, comme la majorité du marché local (${pctVal} %).`,
      });
    } else {
      out.push({
        key: f.key, label: f.label, property: f.value, market_penetration_pct: pctVal,
        verdict: pctVal <= 50 || premium ? "differenciant" : "standard_du_marche",
        message: pctVal <= 50
          ? `${f.label} : présent chez seulement ${pctVal} % du marché local — élément différenciant.`
          : `${f.label} : présent chez ${pctVal} % du marché local — équipement attendu.`,
      });
    }
  }
  return out;
}

/* ───────────────────────────── sélection des photos (§6) ───────────────────────────── */

export interface PhotoSelectionInput {
  id: string;
  category?: string | null;
  aesthetic?: number | null;
  technical?: number | null;
  importance?: number | null;
  usable?: boolean;
}

export interface PhotoSelectionResult {
  id: string;
  category: string | null;
  score: number | null;
  selected: boolean;
  manual: boolean;
  reason: string;
}

export const PHOTO_MIN_TECHNICAL = 40;
export const PHOTO_MIN_AESTHETIC = 35;
export const PHOTO_MAX_SELECTED = 12;

/** Classe les photos et écarte automatiquement les mauvaises ; la main reprend toujours la main. */
export function selectReportPhotos(
  photos: PhotoSelectionInput[],
  manual: Record<string, boolean> = {},
): PhotoSelectionResult[] {
  const scored = photos.map((p) => {
    const a = isNum(p.aesthetic) ? p.aesthetic : null;
    const t = isNum(p.technical) ? p.technical : null;
    const i = isNum(p.importance) ? p.importance : null;
    const parts = [
      a !== null ? { w: 0.4, v: a } : null,
      t !== null ? { w: 0.35, v: t } : null,
      i !== null ? { w: 0.25, v: i } : null,
    ].filter(Boolean) as { w: number; v: number }[];
    const score = parts.length
      ? Math.round(parts.reduce((s, x) => s + x.w * x.v, 0) / parts.reduce((s, x) => s + x.w, 0))
      : null;
    const tooLow = (t !== null && t < PHOTO_MIN_TECHNICAL) || (a !== null && a < PHOTO_MIN_AESTHETIC);
    const eligible = p.usable !== false && !tooLow && score !== null;
    return {
      id: p.id,
      category: p.category ?? null,
      score,
      eligible,
      reason: p.usable === false ? "Écartée par l'analyse (inexploitable)"
        : tooLow ? "Qualité insuffisante"
        : score === null ? "Non analysée"
        : "Retenue automatiquement",
    };
  });

  scored.sort((x, y) => (y.score ?? -1) - (x.score ?? -1));

  let kept = 0;
  return scored.map((p) => {
    const manualChoice = manual[p.id];
    let selected = p.eligible && kept < PHOTO_MAX_SELECTED;
    if (selected) kept++;
    let reason = selected ? p.reason : p.eligible ? "Au-delà du nombre de photos retenues" : p.reason;
    if (manualChoice !== undefined) {
      selected = manualChoice;
      reason = manualChoice ? "Ajoutée manuellement" : "Retirée manuellement";
    }
    return { id: p.id, category: p.category, score: p.score, selected, manual: manualChoice !== undefined, reason };
  });
}

/* ───────────────────────────── extraction RDNA (§15, §16, §17) ───────────────────────────── */

export interface RdnaValue<T = number> {
  value: T | null;
  currency?: string | null;
  unit?: string | null;
  source: "RDNA";
  page: number | null;
}

export interface RdnaComparable {
  titre: string | null;
  chambres: number | null;
  sdb: number | null;
  capacite: number | null;
  revenus: RdnaValue | null;
  jours_disponibles: number | null;
  occupation_pct: number | null;
  adr: RdnaValue | null;
  localisation: string | null;
  equipements: string[];
  page: number | null;
}

export interface RdnaExtraction {
  source: "RDNA";
  extracted_at: string;
  document: { file_name: string | null; storage_path: string | null; pages: number | null };
  market_score: RdnaValue | null;
  projected_revenue: RdnaValue | null;
  occupancy_pct: RdnaValue | null;
  adr: RdnaValue | null;
  confidence: string | null;
  available_days: RdnaValue | null;
  monthly_revenue: { month: string; value: RdnaValue }[];
  annual_revenue_history: { year: string; value: RdnaValue }[];
  comparables: RdnaComparable[];
  amenity_penetration: Record<string, number>;
  extra: Record<string, unknown>;
  /** Champs attendus mais absents du PDF (§15 : rien n'est inventé). */
  missing: string[];
}

function rdnaValue(raw: any, defaultCurrency: string | null): RdnaValue | null {
  if (raw === null || raw === undefined) return null;
  if (isNum(raw)) return { value: raw, currency: defaultCurrency, unit: null, source: "RDNA", page: null };
  if (typeof raw === "object") {
    const v = isNum(raw.value) ? raw.value : null;
    if (v === null) return null;
    return {
      value: v,
      currency: asStr(raw.currency) ?? defaultCurrency,
      unit: asStr(raw.unit),
      source: "RDNA",
      page: isNum(raw.page) ? raw.page : null,
    };
  }
  return null;
}

/**
 * Normalise l'extraction du PDF SANS convertir ni arrondir : la valeur d'origine,
 * sa devise et sa page sont conservées. Les conversions restent au moteur (§16).
 */
export function normalizeRdnaExtraction(
  raw: any,
  meta: { file_name?: string | null; storage_path?: string | null } = {},
): RdnaExtraction {
  const cur = asStr(raw?.currency) ?? "USD";
  const missing: string[] = [];
  const need = (key: string, v: unknown) => { if (v === null || v === undefined) missing.push(key); return v; };

  const market_score = rdnaValue(raw?.market_score, null);
  const projected_revenue = rdnaValue(raw?.projected_revenue ?? raw?.annual_revenue, cur);
  const occupancy = rdnaValue(raw?.occupancy_pct ?? raw?.occupancy, null);
  const adr = rdnaValue(raw?.adr, cur);

  need("market_score", market_score);
  need("projected_revenue", projected_revenue);
  need("occupancy_pct", occupancy);
  need("adr", adr);

  const pen: Record<string, number> = {};
  const rawPen = raw?.amenity_penetration ?? raw?.comparable_amenities ?? {};
  if (rawPen && typeof rawPen === "object" && !Array.isArray(rawPen)) {
    for (const [k, v] of Object.entries(rawPen)) if (isNum(v)) pen[k.toLowerCase()] = v > 1 ? v / 100 : v;
  }

  return {
    source: "RDNA",
    extracted_at: new Date().toISOString(),
    document: {
      file_name: meta.file_name ?? null,
      storage_path: meta.storage_path ?? null,
      pages: isNum(raw?.pages) ? raw.pages : null,
    },
    market_score,
    projected_revenue,
    occupancy_pct: occupancy ? { ...occupancy, unit: "%" } : null,
    adr,
    confidence: asStr(raw?.confidence),
    available_days: rdnaValue(raw?.available_days, null),
    monthly_revenue: asArray(raw?.monthly_revenue)
      .map((m) => {
        const value = rdnaValue(m?.value ?? m?.revenue, cur);
        const month = asStr(m?.month);
        return month && value ? { month, value } : null;
      })
      .filter(Boolean) as { month: string; value: RdnaValue }[],
    annual_revenue_history: asArray(raw?.annual_revenue_history)
      .map((y) => {
        const value = rdnaValue(y?.value ?? y?.revenue, cur);
        const year = asStr(y?.year) ?? (isNum(y?.year) ? String(y.year) : null);
        return year && value ? { year, value } : null;
      })
      .filter(Boolean) as { year: string; value: RdnaValue }[],
    comparables: asArray(raw?.comparables).slice(0, 15).map((c) => ({
      titre: asStr(c?.titre) ?? asStr(c?.nom) ?? asStr(c?.title),
      chambres: isNum(c?.chambres) ? c.chambres : isNum(c?.bedrooms) ? c.bedrooms : null,
      sdb: isNum(c?.sdb) ? c.sdb : isNum(c?.bathrooms) ? c.bathrooms : null,
      capacite: isNum(c?.capacite) ? c.capacite : isNum(c?.capacity) ? c.capacity : null,
      revenus: rdnaValue(c?.revenus ?? c?.revenue, cur),
      jours_disponibles: isNum(c?.jours_disponibles) ? c.jours_disponibles : isNum(c?.available_days) ? c.available_days : null,
      occupation_pct: isNum(c?.occupation_pct) ? c.occupation_pct : isNum(c?.occupancy) ? c.occupancy : null,
      adr: rdnaValue(c?.adr, cur),
      localisation: asStr(c?.localisation) ?? asStr(c?.location),
      equipements: asArray(c?.equipements ?? c?.amenities).map(String),
      page: isNum(c?.page) ? c.page : null,
    })),
    amenity_penetration: pen,
    extra: (raw?.extra && typeof raw.extra === "object") ? raw.extra : {},
    missing,
  };
}

/** Vue « ancienne » attendue par le moteur : conversion explicite, jamais silencieuse. */
export function rdnaToEngineData(ext: RdnaExtraction, usdEurRate: number) {
  const conv = (v: RdnaValue | null) => {
    if (!v || v.value === null) return null;
    const c = (v.currency ?? "EUR").toUpperCase();
    return c === "USD" ? Math.round(v.value * usdEurRate * 100) / 100 : v.value;
  };
  return {
    market_score: ext.market_score?.value ?? null,
    adr_eur: conv(ext.adr),
    occupation_pct: ext.occupancy_pct?.value ?? null,
    revenu_annuel_eur: conv(ext.projected_revenue),
    confiance: ext.confidence,
    monthly_revenue: ext.monthly_revenue.map((m) => ({ month: m.month, revenue_eur: conv(m.value) ?? 0 })),
    amenity_penetration: ext.amenity_penetration,
    conversion: { usd_eur_rate: usdEurRate, applied_by: "engine" as const },
  };
}

/* ───────────────────────────── résumé interne (§21) ───────────────────────────── */

export interface PropertySummary {
  positionnement: string | null;
  standing: number | null;
  forces: string[];
  faiblesses: string[];
  usp: string[];
  clientele_cible: { primary: string | null; secondary: string[] };
  points_a_ameliorer: string[];
  potentiel_locatif: string | null;
  risques: string[];
  conflits: string[];
  confiance: ConfidenceBand;
}

export function buildPropertySummary(
  ai: AiAnalysisPayload | null | undefined,
  facts: ResolvedFact[],
): PropertySummary {
  return {
    positionnement: ai?.positioning.label ?? null,
    standing: ai?.scores.STANDING_SCORE ?? null,
    forces: (ai?.strengths ?? []).map((s) => s.label),
    faiblesses: (ai?.weaknesses ?? []).map((s) => s.label),
    usp: (ai?.usp ?? []).map((s) => s.label),
    clientele_cible: { primary: ai?.target.primary ?? null, secondary: ai?.target.secondary ?? [] },
    points_a_ameliorer: (ai?.recommendations ?? []).map((r) => r.label),
    potentiel_locatif: ai?.summary.potentiel_locatif ?? null,
    risques: ai?.summary.risques ?? [],
    conflits: facts.filter((f) => f.conflict).map((f) => f.conflict!.message),
    confiance: confidenceBand(ai?.global_confidence ?? null),
  };
}

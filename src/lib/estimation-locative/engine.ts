// MODULE — Estimation locative · MOTEUR DE CALCUL
// ─────────────────────────────────────────────────────────────────────────────
// Objectif : maximiser le CA annuel potentiel sous contraintes de crédibilité
// commerciale. Aucune valeur inventée : une donnée absente reste UNKNOWN (null)
// et est listée dans `unknowns`. Tous les coefficients viennent de engine-config.
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_ENGINE_CONFIG, mergeConfig, type EngineConfig } from "./engine-config";
import type {
  AdjustmentItem, ComparableInput, EngineAlert, EngineOutput, ScoredComparable,
  SeasonKey, SeasonResult,
} from "./engine-types";
import type { DataSource } from "./constants";

const SEASON_LABEL: Record<SeasonKey, string> = {
  basse: "Basse saison",
  moyenne: "Moyenne saison",
  haute: "Très haute saison",
};

export interface EngineInput {
  city?: string | null;
  district?: string | null;
  property_type?: string | null;
  lat?: number | null;
  lng?: number | null;
  location_data?: Record<string, any>;
  features?: Record<string, any>;
  constraints?: Record<string, any>;
  ai_scores?: Record<string, any>;
  ai_analysis?: Record<string, any>;
  rdna_data?: Record<string, any>;
  market_data?: Record<string, any>;
  photos_count?: number;
  comparables: ComparableInput[];
}

/* ───────────────────────── utilitaires numériques ───────────────────────── */

const isNum = (v: any): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;
const pct = (v: number) => Math.round(v * 1000) / 10;

/**
 * Normalise en liste de chaînes une donnée conceptuellement multi-valuée
 * (extérieurs, équipements). Les données persistées ou importées peuvent
 * arriver sous forme de tableau, de JSON stringifié, de chaîne simple, ou
 * être absentes. Aucune information n'est inventée : une valeur inexploitable
 * donne une liste vide (donnée absente), jamais une valeur par défaut.
 */
export function toStringList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .filter((x) => typeof x === "string" || typeof x === "number")
      .map((x) => String(x).trim())
      .filter((x) => x.length > 0);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return toStringList(parsed);
      } catch {
        // chaîne non parsable : traitée comme une valeur unique ci-dessous
      }
    }
    return [s];
  }
  return [];
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* ───────────────────────── normalisation devise (§3) ───────────────────────── */

/** Convertit en EUR si la source est libellée en USD. Ne modifie jamais la source. */
export function toEur(value: number | null | undefined, currency: string | null | undefined, cfg: EngineConfig) {
  if (!isNum(value)) return null;
  const c = (currency ?? "EUR").toUpperCase();
  if (c === "USD") return round2(value * cfg.currency.usd_to_eur);
  return round2(value);
}

/* ───────────────────────── lecture des caractéristiques ───────────────────────── */

const has = (s?: string | null, ...needles: string[]) =>
  !!s && needles.some((n) => s.toLowerCase().includes(n));

function poolKind(v?: string | null): "privee" | "commune" | "aucune" | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes("privé")) return "privee";
  if (s.includes("commune")) return "commune";
  if (s.includes("pas de piscine")) return "aucune";
  if (s.includes("inconnue")) return null;
  if (s.includes("piscine")) return "commune"; // chauffée / saisonnière sans précision de propriété
  return null;
}

function viewKind(v?: string | null): "panoramique" | "partielle" | "degagee" | "aucune" | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes("panoramique")) return "panoramique";
  if (s.includes("partielle")) return "partielle";
  if (s === "mer" || s.includes("mer")) return "partielle";
  if (s.includes("aucune")) return "aucune";
  if (["jardin", "piscine", "montagne", "ville"].some((k) => s.includes(k))) return "degagee";
  return null;
}

function parkingKind(v?: string | null): "garage" | "prive" | "rue" | "aucun" | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes("garage")) return "garage";
  if (s.includes("privée") || s.includes("privé") || s.includes("plusieurs") || s.includes("résidence")) return "prive";
  if (s.includes("rue")) return "rue";
  if (s.includes("aucun")) return "aucun";
  return null;
}

function acKind(v?: string | null): "totale" | "partielle" | "aucune" | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s.includes("toutes")) return "totale";
  if (s.includes("certaines") || s.includes("salon")) return "partielle";
  if (s.includes("aucune")) return "aucune";
  return null;
}

/* ───────────────────────── §5 · similarité des comparables ───────────────────────── */

function axisScore(a: any, b: any, kind: string, cfg: EngineConfig): number | null {
  switch (kind) {
    case "distance": {
      if (!isNum(b)) return null;
      const { distance_full_m: full, distance_zero_m: zero } = cfg.similarity;
      if (b <= full) return 1;
      if (b >= zero) return 0;
      return 1 - (b - full) / (zero - full);
    }
    case "count": {
      if (!isNum(a) || !isNum(b)) return null;
      const diff = Math.abs(a - b);
      return clamp(1 - diff / Math.max(2, a || 2), 0, 1);
    }
    case "surface": {
      if (!isNum(a) || !isNum(b) || a <= 0) return null;
      return clamp(1 - Math.abs(a - b) / a, 0, 1);
    }
    case "text": {
      if (!a || !b) return null;
      return String(a).trim().toLowerCase() === String(b).trim().toLowerCase() ? 1 : 0;
    }
    default:
      return null;
  }
}

function categoricalScore<T extends string>(a: T | null, b: T | null, order: T[]): number | null {
  if (!a || !b) return null;
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia < 0 || ib < 0) return null;
  const span = Math.max(1, order.length - 1);
  return 1 - Math.abs(ia - ib) / span;
}

export function scoreComparable(
  subject: EngineInput,
  c: ComparableInput,
  cfg: EngineConfig,
): { score: number; detail: Record<string, number | null>; missing: string[] } {
  const f = subject.features ?? {};
  const w = cfg.similarity.weights;
  const detail: Record<string, number | null> = {};
  const missing: string[] = [];

  detail.distance = axisScore(null, c.distance_m, "distance", cfg);
  detail.commune = axisScore(subject.city, c.city, "text", cfg);
  detail.quartier = axisScore(subject.district, c.district, "text", cfg);
  detail.chambres = axisScore(f.chambres, c.bedrooms, "count", cfg);
  detail.capacite = axisScore(f.couchages, c.capacity, "count", cfg);
  detail.sdb = axisScore(f.salles_de_bain, c.bathrooms, "count", cfg);
  detail.type = axisScore(subject.property_type, c.property_type, "text", cfg);
  detail.surface = axisScore(f.surface_interieure_m2, c.surface_m2, "surface", cfg);
  // Piscine privée ≠ piscine commune ≠ pas de piscine (§5).
  detail.piscine = categoricalScore(poolKind(f.piscine), poolKind(c.pool), ["aucune", "commune", "privee"]);
  detail.parking = categoricalScore(parkingKind(f.parking), parkingKind(c.parking), ["aucun", "rue", "prive", "garage"]);
  // Vue panoramique ≠ absence de vue (§5).
  detail.vue = categoricalScore(viewKind(f.vue), viewKind(c.view), ["aucune", "degagee", "partielle", "panoramique"]);
  detail.exterieur = c.exterior
    ? (f.exterieurs ?? []).some((e: string) => has(c.exterior, e.toLowerCase())) ? 1 : 0
    : null;
  detail.climatisation = categoricalScore(acKind(f.climatisation), acKind(c.ac), ["aucune", "partielle", "totale"]);
  detail.standing = isNum(c.standing) && isNum(subject.ai_scores?.standing)
    ? clamp(1 - Math.abs(Number(subject.ai_scores.standing) - c.standing) / 100, 0, 1)
    : null;
  detail.equipements = c.amenities?.length && (f.equipements ?? []).length
    ? jaccard(f.equipements as string[], c.amenities)
    : null;
  detail.proximite_mer = isNum(c.distance_sea_m) && isNum(subject.location_data?.distance_mer_m)
    ? clamp(1 - Math.abs(Number(subject.location_data.distance_mer_m) - c.distance_sea_m) / 3000, 0, 1)
    : null;

  let sum = 0;
  let total = 0;
  for (const [k, v] of Object.entries(detail)) {
    const weight = (w as any)[k] ?? 0;
    if (v === null) { missing.push(k); continue; }
    sum += v * weight;
    total += weight;
  }
  // Un axe inconnu est simplement exclu (jamais compté comme favorable §15).
  const score = total > 0 ? Math.round((sum / total) * 100) : 0;
  return { score, detail, missing };
}

function jaccard(a: string[], b: string[]) {
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : null as any;
}

/* ───────────────────────── §6 · Market Baseline ───────────────────────── */

function buildComparables(input: EngineInput, cfg: EngineConfig): ScoredComparable[] {
  const scored: ScoredComparable[] = input.comparables.map((c) => {
    const { score, detail, missing } = scoreComparable(input, c, cfg);
    return {
      id: c.id,
      name: c.name ?? null,
      adr: toEur(c.adr, c.currency, cfg),
      occupancy: isNum(c.occupancy_pct) ? c.occupancy_pct / (c.occupancy_pct > 1 ? 100 : 1) : null,
      score,
      weight: 0,
      outlier: false,
      used: false,
      detail,
      missing,
    };
  });

  const eligible = scored
    .filter((s, i) => !input.comparables[i].excluded && isNum(s.adr) && s.score >= cfg.similarity.min_score_to_use)
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.similarity.max_used);

  // Détection d'outliers (MAD) sur l'ADR — un comparable aberrant ne doit pas déformer le marché.
  const adrs = eligible.map((e) => e.adr as number);
  if (adrs.length >= cfg.baseline.outlier_min_sample) {
    const med = median(adrs)!;
    const mad = median(adrs.map((v) => Math.abs(v - med)))!;
    const spread = mad > 0 ? mad * 1.4826 : med * 0.15;
    for (const e of eligible) {
      if (Math.abs((e.adr as number) - med) > cfg.baseline.outlier_mad_factor * spread) e.outlier = true;
    }
  }

  const kept = eligible.filter((e) => !e.outlier);
  for (const e of kept) {
    e.used = true;
    e.weight = round2(Math.pow(e.score / 100, cfg.similarity.weight_exponent));
  }
  return scored;
}

function weightedMean(pairs: { v: number | null; w: number }[]): number | null {
  const usable = pairs.filter((p) => isNum(p.v) && p.w > 0);
  if (!usable.length) return null;
  const wsum = usable.reduce((s, p) => s + p.w, 0);
  if (wsum <= 0) return null;
  return round2(usable.reduce((s, p) => s + (p.v as number) * p.w, 0) / wsum);
}

/* ───────────────────────── §7 · Property Score ───────────────────────── */

function propertyScore(input: EngineInput, cfg: EngineConfig) {
  const src = input.ai_scores ?? {};
  const axes: Record<string, number | null> = {};
  const used: string[] = [];
  const missing: string[] = [];
  let sum = 0;
  let total = 0;
  for (const [axis, weight] of Object.entries(cfg.property_score.axis_weights)) {
    const raw = src[axis];
    const v = isNum(raw) ? clamp(raw > 1 && raw <= 100 ? raw : raw * 100, 0, 100) : null;
    axes[axis] = v;
    if (v === null) { missing.push(axis); continue; }
    used.push(axis);
    sum += v * weight;
    total += weight;
  }
  const totalScore = total > 0 ? Math.round(sum / total) : null;
  return { total: totalScore, axes, axes_used: used, axes_missing: missing };
}

/* ───────────────────────── §9-10 · ajustements relatifs au marché ───────────────────────── */

function penetrationMap(input: EngineInput): Record<string, number> {
  const raw =
    (input.market_data?.penetration as Record<string, any>) ??
    (input.rdna_data?.extra?.amenities as Record<string, any>) ??
    (input.rdna_data?.amenities as Record<string, any>) ??
    {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = typeof v === "number" ? v : Number(String(v).replace("%", "").trim());
    if (Number.isFinite(n)) out[normalizeAmenityKey(k)] = n > 1 ? n / 100 : n;
  }
  return out;
}

function normalizeAmenityKey(k: string) {
  const s = k.toLowerCase();
  if (s.includes("air") || s.includes("clim")) return "climatisation";
  if (s.includes("park")) return "parking";
  if (s.includes("pool") || s.includes("piscine")) return "piscine";
  if (s.includes("internet") || s.includes("wifi")) return "wifi";
  if (s.includes("wash") || s.includes("lave")) return "lave_linge";
  if (s.includes("view") || s.includes("vue")) return "vue";
  return s.replace(/[^a-z]+/g, "_");
}

function buildAdjustments(input: EngineInput, pen: Record<string, number>, cfg: EngineConfig) {
  const f = input.features ?? {};
  const loc = input.location_data ?? {};
  const A = cfg.adjustments;
  const items: AdjustmentItem[] = [];

  /** Modulation par la rareté locale : un atout répandu vaut peu, un atout rare vaut cher. */
  const rarity = (key: string) => {
    const p = pen[key];
    if (!isNum(p)) return { factor: A.unknown_penetration_damping, note: "pénétration marché inconnue — impact atténué" };
    const factor = 1 + (1 - p) * (A.rarity_full_bonus_pct - 1);
    return { factor, note: `${Math.round(p * 100)} % des comparables en disposent` };
  };

  const push = (key: string, label: string, base: number, penKey?: string) => {
    if (!base) return;
    const r = penKey ? rarity(penKey) : { factor: 1, note: "impact indépendant du taux d'équipement" };
    const applied = clamp(base * (base > 0 ? r.factor : 1), -A.max_single_pct, A.max_single_pct);
    items.push({
      key, label, base_pct: base,
      penetration: penKey && isNum(pen[penKey]) ? pen[penKey] : null,
      applied_pct: round2(applied),
      rationale: r.note,
    });
  };

  const v = viewKind(f.vue);
  if (v === "panoramique") push("vue", "Vue mer panoramique", A.features.vue_mer_panoramique, "vue");
  else if (v === "partielle") push("vue", "Vue mer partielle", A.features.vue_mer_partielle, "vue");
  else if (v === "degagee") push("vue", "Vue dégagée", A.features.vue_degagee, "vue");

  const beach = loc.distance_plage_m ?? loc.distance_mer_m;
  if (isNum(beach)) {
    if (beach <= 300) push("plage", "Plage à moins de 300 m", A.features.plage_moins_300m);
    else if (beach <= 800) push("plage", "Plage à moins de 800 m", A.features.plage_moins_800m);
  }
  if (isNum(loc.distance_centre_m) && loc.distance_centre_m <= 600) {
    push("centre", "Centre-ville à pied", A.features.centre_moins_600m);
  }

  const p = poolKind(f.piscine);
  if (p === "privee") push("piscine", "Piscine privée", A.features.piscine_privee, "piscine");
  else if (p === "commune") push("piscine", "Piscine commune", A.features.piscine_commune, "piscine");

  const ext: string[] = f.exterieurs ?? [];
  if (ext.some((e) => /jardin/i.test(e))) push("jardin", "Jardin", A.features.jardin);
  else if (ext.some((e) => /terrasse|rooftop|patio/i.test(e))) push("terrasse", "Terrasse", A.features.terrasse);
  else if (ext.some((e) => /balcon/i.test(e))) push("balcon", "Balcon", A.features.balcon);

  const pk = parkingKind(f.parking);
  if (pk === "garage") push("parking", "Garage", A.features.garage, "parking");
  else if (pk === "prive") push("parking", "Place de parking privée", A.features.parking_prive, "parking");
  else if (pk === "aucun") {
    const missPen = pen.parking;
    if (isNum(missPen)) {
      const penalty = -clamp(missPen * A.missing_standard_max_penalty_pct, 0, A.missing_standard_max_penalty_pct);
      items.push({
        key: "parking", label: "Aucun stationnement", base_pct: A.features.absence_parking,
        penetration: missPen, applied_pct: round2(penalty),
        rationale: `${Math.round(missPen * 100)} % des comparables proposent un stationnement`,
      });
    } else push("parking", "Aucun stationnement", A.features.absence_parking);
  }

  const ac = acKind(f.climatisation);
  if (ac === "totale") push("clim", "Climatisation dans tout le logement", A.features.climatisation_totale, "climatisation");
  else if (ac === "partielle") push("clim", "Climatisation partielle", A.features.climatisation_partielle, "climatisation");
  else if (ac === "aucune") {
    const missPen = pen.climatisation;
    if (isNum(missPen)) {
      const penalty = -clamp(missPen * A.missing_standard_max_penalty_pct, 0, A.missing_standard_max_penalty_pct);
      items.push({
        key: "clim", label: "Pas de climatisation", base_pct: A.features.absence_climatisation,
        penetration: missPen, applied_pct: round2(penalty),
        rationale: `${Math.round(missPen * 100)} % des comparables sont climatisés`,
      });
    } else push("clim", "Pas de climatisation", A.features.absence_climatisation);
  }

  if (f.wifi === "Non") push("wifi", "Pas de Wi-Fi", A.features.absence_wifi, "wifi");

  const raw = items.reduce((s, i) => s + i.applied_pct, 0);
  const total_pct = round2(clamp(raw, -A.max_total_pct, A.max_total_pct));
  if (Math.abs(raw) > A.max_total_pct) {
    const ratio = total_pct / raw;
    for (const i of items) i.applied_pct = round2(i.applied_pct * ratio);
  }
  return { items, total_pct };
}

/* ───────────────────────── §13 · élasticité prix / occupation ───────────────────────── */

function estimateElasticity(comps: ScoredComparable[], cfg: EngineConfig): { value: number; source: DataSource } {
  const pts = comps.filter((c) => c.used && isNum(c.adr) && isNum(c.occupancy) && (c.occupancy as number) > 0);
  if (pts.length < 4) return { value: cfg.elasticity.default, source: "CALCULATED" };
  // Sans dispersion de prix suffisante, une régression n'a aucun sens (§28 : ne rien inventer).
  const logs = pts.map((p) => Math.log(p.adr as number));
  const mean = logs.reduce((s, v) => s + v, 0) / logs.length;
  const dispersion = Math.sqrt(logs.reduce((s, v) => s + (v - mean) ** 2, 0) / logs.length);
  if (dispersion < cfg.elasticity.min_price_dispersion) {
    return { value: cfg.elasticity.default, source: "CALCULATED" };
  }
  // Régression log-log pondérée : ln(occ) = a + e·ln(prix)
  const W = pts.map((p) => p.weight || 0.01);
  const X = pts.map((p) => Math.log(p.adr as number));
  const Y = pts.map((p) => Math.log(p.occupancy as number));
  const sw = W.reduce((s, w) => s + w, 0);
  const mx = X.reduce((s, x, i) => s + x * W[i], 0) / sw;
  const my = Y.reduce((s, y, i) => s + y * W[i], 0) / sw;
  let num = 0, den = 0;
  for (let i = 0; i < X.length; i++) {
    num += W[i] * (X[i] - mx) * (Y[i] - my);
    den += W[i] * (X[i] - mx) ** 2;
  }
  if (den <= 0) return { value: cfg.elasticity.default, source: "CALCULATED" };
  const e = clamp(num / den, cfg.elasticity.min, cfg.elasticity.max);
  return { value: round2(e), source: "RDNA" };
}

/* ───────────────────────── §11 · saisonnalité ───────────────────────── */

const MONTH_NIGHTS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function buildSeasonality(input: EngineInput, cfg: EngineConfig) {
  const monthly: { month: string; revenue_eur: number }[] =
    input.rdna_data?.monthly_revenue ?? input.market_data?.monthly_revenue ?? [];
  const S = cfg.seasonality;

  if (Array.isArray(monthly) && monthly.length >= 12) {
    const total = monthly.reduce((s, m) => s + (Number(m.revenue_eur) || 0), 0);
    if (total > 0) {
      const nights = { basse: 0, moyenne: 0, haute: 0 };
      const idx = { basse: [] as number[], moyenne: [] as number[], haute: [] as number[] };
      monthly.slice(0, 12).forEach((m, i) => {
        const share = (Number(m.revenue_eur) || 0) / total;
        const key: SeasonKey = share >= S.month_high_share ? "haute" : share >= S.month_mid_share ? "moyenne" : "basse";
        nights[key] += MONTH_NIGHTS[i];
        idx[key].push(share);
      });
      if (nights.haute > 0 && nights.basse > 0) {
        // Indice de prix relatif déduit du revenu par nuit de chaque saison.
        const perNight = (k: SeasonKey) =>
          idx[k].length ? (idx[k].reduce((s, v) => s + v, 0) * total) / Math.max(nights[k], 1) : null;
        const pnB = perNight("basse"), pnM = perNight("moyenne"), pnH = perNight("haute");
        const ref = pnM ?? pnB ?? pnH ?? 1;
        return {
          nights,
          price_index: {
            basse: pnB ? round2(clamp(pnB / ref, 0.4, 1.2)) : S.default_price_index.basse,
            moyenne: pnM ? 1 : S.default_price_index.moyenne,
            haute: pnH ? round2(clamp(pnH / ref, 1, 2.6)) : S.default_price_index.haute,
          },
          occupancy_shape: S.default_occupancy,
          source: "RDNA" as DataSource,
        };
      }
    }
  }
  return {
    nights: S.default_nights,
    price_index: S.default_price_index,
    occupancy_shape: S.default_occupancy,
    source: "CALCULATED" as DataSource,
  };
}

/* ───────────────────────── §16 · prix psychologique ───────────────────────── */

export function psychologicalPrice(math: number, cfg: EngineConfig): number {
  if (!cfg.psychological.enabled) return Math.round(math);
  const maxDrift = (math * cfg.psychological.max_drift_pct) / 100;
  let best = Math.round(math);
  let bestCost = Infinity;
  for (let cand = Math.floor(math - maxDrift); cand <= Math.ceil(math + maxDrift); cand++) {
    if (cand <= 0) continue;
    const ending = cand % 10;
    const rank = cfg.psychological.endings.indexOf(ending);
    if (rank < 0) continue;
    const cost = Math.abs(cand - math) + rank * 0.4;
    if (cost < bestCost) { bestCost = cost; best = cand; }
  }
  return best;
}

/* ───────────────────────── moteur principal ───────────────────────── */

export function runEngine(input: EngineInput, overrides?: unknown): EngineOutput {
  const cfg = overrides ? mergeConfig(overrides) : DEFAULT_ENGINE_CONFIG;
  const trace: { step: string; detail: string }[] = [];
  const alerts: EngineAlert[] = [];
  const unknowns: string[] = [];

  /* 1 — comparables scorés, pondérés, nettoyés des aberrations */
  const comps = buildComparables(input, cfg);
  const used = comps.filter((c) => c.used);
  const outliers = comps.filter((c) => c.outlier);
  trace.push({
    step: "Comparables",
    detail: `${input.comparables.length} comparables reçus · ${used.length} retenus (score ≥ ${cfg.similarity.min_score_to_use}) · ${outliers.length} écartés comme aberrants`,
  });
  if (outliers.length) {
    alerts.push({ level: "info", message: `${outliers.length} comparable(s) écarté(s) : valeur trop éloignée de la médiane du marché.` });
  }

  /* 2 — marché de référence */
  const compsAdr = weightedMean(used.map((c) => ({ v: c.adr, w: c.weight })));
  const compsOcc = weightedMean(used.map((c) => ({ v: c.occupancy, w: c.weight })));
  const rdnaCurrency = (input.rdna_data?.currency as string) ?? (input.rdna_data?.extra?.currency as string) ?? "EUR";
  const rdnaAdr = toEur(input.rdna_data?.adr_eur ?? input.rdna_data?.adr, rdnaCurrency, cfg);
  const rdnaOccRaw = input.rdna_data?.occupation_pct;
  const rdnaOcc = isNum(rdnaOccRaw) ? clamp(rdnaOccRaw > 1 ? rdnaOccRaw / 100 : rdnaOccRaw, 0, 1) : null;

  const sw = cfg.baseline.source_weights;
  const baselineAdr = weightedMean([
    { v: rdnaAdr, w: sw.rdna_market },
    { v: compsAdr, w: sw.comparables },
  ]);
  const baselineOcc = weightedMean([
    { v: rdnaOcc, w: sw.rdna_market },
    { v: compsOcc, w: sw.comparables },
  ]);

  const sourcesUsed: string[] = [];
  if (isNum(rdnaAdr)) sourcesUsed.push("RDNA");
  if (isNum(compsAdr)) sourcesUsed.push("Comparables");
  if (!isNum(baselineAdr)) unknowns.push("market_baseline_adr");
  if (!isNum(baselineOcc)) unknowns.push("market_baseline_occupancy");

  trace.push({
    step: "Market Baseline",
    detail: isNum(baselineAdr)
      ? `ADR de marché ${baselineAdr} € (RDNA ${rdnaAdr ?? "—"} € · comparables pondérés ${compsAdr ?? "—"} €), occupation de marché ${baselineOcc !== null ? pct(baselineOcc) + " %" : "inconnue"}`
      : "Aucune donnée de marché exploitable — le moteur ne peut pas calculer de prix.",
  });

  const pen = penetrationMap(input);
  const score = propertyScore(input, cfg);
  if (score.total === null) unknowns.push("property_score");
  trace.push({
    step: "Property Score",
    detail: score.total === null
      ? "Analyse IA absente — aucun score du bien ; le positionnement reste inconnu."
      : `Score ${score.total}/100 sur ${score.axes_used.length} axes renseignés (${score.axes_missing.length} axes inconnus, exclus du calcul)`,
  });

  const tier = score.total === null
    ? null
    : [...cfg.positioning.tiers].reverse().find((t) => (score.total as number) >= t.min_score) ?? cfg.positioning.tiers[0];
  if (tier) {
    trace.push({ step: "Positionnement", detail: `${tier.label} — facteur ${tier.price_factor} appliqué au marché` });
  }

  const adjustments = buildAdjustments(input, pen, cfg);
  trace.push({
    step: "Ajustements",
    detail: adjustments.items.length
      ? `${adjustments.items.length} facteurs · effet net ${adjustments.total_pct > 0 ? "+" : ""}${adjustments.total_pct} %`
      : "Aucun facteur différenciant identifié",
  });

  /* 3 — prix de référence du bien */
  const referenceAdr = isNum(baselineAdr)
    ? round2(baselineAdr * (tier?.price_factor ?? 1) * (1 + adjustments.total_pct / 100))
    : null;

  /* 4 — élasticité et optimisation du revenu */
  const el = estimateElasticity(comps, cfg);
  const curve: { price: number; occupancy: number; revenue: number }[] = [];
  let optimal: number | null = null;
  let optimalBefore: number | null = null;
  let guardrail: string | null = null;

  // Facteurs d'occupation propres au bien (durée minimale + compétitivité du coût total).
  const minStay = input.constraints?.duree_minimale as string | undefined;
  const minStayFactor = minStay ? cfg.min_stay.occupancy_factor[minStay] ?? 1 : 1;
  const cleaning = input.constraints?.prix_menage_eur;
  let cleaningFactor = 1;
  if (isNum(cleaning) && isNum(baselineAdr) && baselineAdr > 0) {
    // Le ménage n'est PAS un revenu du bien, mais il pèse sur le coût total payé (§17).
    const perNight = cleaning / cfg.cleaning.assumed_stay_nights;
    const load = perNight / baselineAdr;
    cleaningFactor = 1 - clamp(load, 0, cfg.cleaning.max_occupancy_impact_pct / 100);
  }

  // Le prix « juste » du bien (référence) est l'ancrage : à ce prix, le bien réalise
  // l'occupation de marché. S'en écarter fait décrocher l'occupation, d'autant plus
  // vite que l'écart grandit (courbure) — c'est ce qui crée un optimum de revenu réel.
  const occAt = (price: number) => {
    if (!isNum(baselineOcc) || !isNum(referenceAdr) || referenceAdr <= 0 || price <= 0) return null;
    const x = Math.log(price / referenceAdr);
    const raw = baselineOcc * Math.exp(el.value * x - cfg.elasticity.curvature * x * x);
    return clamp(raw * minStayFactor * cleaningFactor, cfg.elasticity.occupancy_floor, cfg.elasticity.occupancy_cap);
  };

  if (isNum(referenceAdr) && isNum(baselineAdr) && isNum(baselineOcc)) {
    const O = cfg.optimization;
    let best: { price: number; occupancy: number; revenue: number } | null = null;
    for (let f = O.search_min_factor; f <= O.search_max_factor + 1e-9; f += O.search_step) {
      const price = round2(referenceAdr * f);
      const occ = occAt(price);
      if (occ === null) continue;
      const revenue = price * occ;
      curve.push({ price, occupancy: round2(occ), revenue: round2(revenue) });
      if (occ < O.min_acceptable_occupancy) continue;
      if (!best || revenue > best.revenue) best = { price, occupancy: occ, revenue };
    }
    const refOcc = occAt(referenceAdr);
    const refRevenue = refOcc !== null ? referenceAdr * refOcc : null;
    if (best && refRevenue) {
      const gain = ((best.revenue - refRevenue) / refRevenue) * 100;
      // On ne s'écarte du prix de marché que si le gain de revenu le justifie (§14).
      optimalBefore = gain >= O.min_revenue_gain_pct ? best.price : referenceAdr;
    } else {
      optimalBefore = referenceAdr;
    }

    /* 5 — garde-fous (§15) */
    const thin = used.length < cfg.guardrails.thin_data_comparables;
    const maxUp = thin ? cfg.guardrails.thin_data_max_deviation_pct : cfg.guardrails.max_above_market_pct;
    const maxDown = thin ? cfg.guardrails.thin_data_max_deviation_pct : cfg.guardrails.max_below_market_pct;
    const ceiling = baselineAdr * (1 + maxUp / 100);
    const floor = baselineAdr * (1 - maxDown / 100);
    optimal = clamp(optimalBefore, floor, ceiling);
    if (optimal !== optimalBefore) {
      guardrail = optimal === round2(ceiling) || optimal === ceiling
        ? `Prix plafonné à +${maxUp} % du marché`
        : `Prix relevé au plancher de −${maxDown} % du marché`;
      alerts.push({ level: "warning", message: `${guardrail} (garde-fou${thin ? " renforcé : peu de comparables" : ""}).` });
    }
    if (thin && used.length > 0) {
      alerts.push({ level: "warning", message: `Seulement ${used.length} comparable(s) exploitable(s) : estimation à confirmer.` });
    }
    optimal = round2(optimal);
    trace.push({
      step: "Modèle d'occupation",
      detail: `Élasticité ${el.value} (${el.source === "RDNA" ? "déduite des comparables" : "valeur de référence du moteur"})· durée minimale ×${minStayFactor}${cleaningFactor < 1 ? ` · coût total du séjour ×${round2(cleaningFactor)}` : ""}`,
    });
    trace.push({
      step: "Prix optimisé",
      detail: `Référence ${referenceAdr} € → optimum revenu ${optimal} €${guardrail ? ` (${guardrail})` : ""}`,
    });
  } else {
    unknowns.push("optimal_adr");
  }

  /* 6 — saisons */
  const seasonality = buildSeasonality(input, cfg);
  const blocked = isNum(input.constraints?.nuits_bloquees) ? clamp(input.constraints.nuits_bloquees, 0, 365) : 0;
  const nightsYear = 365;
  const sellableYear = nightsYear - blocked;

  // Occupation cible calée sur le marché, répartie selon la forme saisonnière.
  const shape = seasonality.occupancy_shape;
  const nights = seasonality.nights;
  const shapeAvg =
    (shape.basse * nights.basse + shape.moyenne * nights.moyenne + shape.haute * nights.haute) /
    Math.max(1, nights.basse + nights.moyenne + nights.haute);

  const seasons = {} as Record<SeasonKey, SeasonResult>;
  const breakdown: EngineOutput["annual"]["breakdown"] = [];
  let bookedTotal = 0;
  let revenueTotal = 0;
  let hasSeasonData = false;

  (["basse", "moyenne", "haute"] as SeasonKey[]).forEach((k) => {
    const nightsTotal = nights[k];
    const nightsSellable = Math.max(0, Math.round(nightsTotal * (sellableYear / nightsYear)));
    let priceMath: number | null = null;
    let priceReco: number | null = null;
    let occ: number | null = null;
    let booked: number | null = null;
    let revenue: number | null = null;

    if (isNum(optimal)) {
      priceMath = round2(optimal * seasonality.price_index[k]);
      priceReco = psychologicalPrice(priceMath, cfg);
      const globalOcc = occAt(optimal);
      if (globalOcc !== null && shapeAvg > 0) {
        occ = clamp((globalOcc * shape[k]) / shapeAvg, cfg.elasticity.occupancy_floor, cfg.elasticity.occupancy_cap);
        booked = Math.round(nightsSellable * occ);
        revenue = Math.round(booked * (priceReco as number));
        bookedTotal += booked;
        revenueTotal += revenue;
        hasSeasonData = true;
        breakdown.push({
          label: SEASON_LABEL[k], nights: nightsSellable,
          occupancy_pct: pct(occ), adr: priceReco as number, revenue,
        });
      }
    }

    const lowConf = false; // ajusté ci-dessous une fois la confiance connue
    const spanLow = cfg.ranges.low_pct + (lowConf ? cfg.ranges.low_confidence_extra_pct : 0);
    const spanHigh = cfg.ranges.high_pct + (lowConf ? cfg.ranges.low_confidence_extra_pct : 0);

    seasons[k] = {
      key: k,
      label: SEASON_LABEL[k],
      nights_total: nightsTotal,
      nights_sellable: nightsSellable,
      price_math: priceMath,
      price_recommended: priceReco,
      price_min: priceReco ? psychologicalPrice(priceReco * (1 - spanLow / 100), cfg) : null,
      price_max: priceReco ? psychologicalPrice(priceReco * (1 + spanHigh / 100), cfg) : null,
      occupancy_pct: occ !== null ? pct(occ) : null,
      nights_booked: booked,
      revenue,
    };
  });

  if (!hasSeasonData) unknowns.push("seasons");

  const annualOcc = hasSeasonData && sellableYear > 0 ? bookedTotal / sellableYear : null;
  const adrWeighted = hasSeasonData && bookedTotal > 0 ? round2(revenueTotal / bookedTotal) : null;

  trace.push({
    step: "Saisonnalité",
    detail: `${seasonality.source === "RDNA" ? "Déduite des revenus mensuels RDNA" : "Profil de référence du marché varois (aucune donnée mensuelle disponible)"} · ${nights.basse}/${nights.moyenne}/${nights.haute} nuits (basse/moyenne/haute)`,
  });
  if (blocked > 0) {
    trace.push({ step: "Nuits propriétaire", detail: `${blocked} nuits bloquées → ${sellableYear} nuits commercialisables` });
  }
  if (hasSeasonData) {
    trace.push({
      step: "CA annuel",
      detail: breakdown.map((b) => `${b.label} : ${b.nights} nuits × ${b.occupancy_pct} % × ${b.adr} € = ${b.revenue} €`).join(" · ") +
        ` → total ${revenueTotal} €`,
    });
  }

  /* 7 — cohérence des sources (§26) */
  const modelAdr = isNum(optimal) ? optimal : null;
  const values = [rdnaAdr, compsAdr, modelAdr].filter(isNum) as number[];
  let divergence: number | null = null;
  let verdict: EngineOutput["coherence"]["verdict"] = "insuffisant";
  if (values.length >= 2) {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    divergence = round2(((hi - lo) / lo) * 100);
    if (divergence >= cfg.confidence.source_divergence_critical_pct) {
      verdict = "conflit";
      alerts.push({
        level: "critical",
        message: `Les sources divergent fortement (${divergence} % d'écart entre ${lo} € et ${hi} €). Validation humaine nécessaire avant le rapport.`,
      });
    } else if (divergence >= cfg.confidence.source_divergence_alert_pct) {
      verdict = "ecart";
      alerts.push({ level: "warning", message: `Écart de ${divergence} % entre les sources de marché — à vérifier.` });
    } else verdict = "coherent";
  }

  /* 8 — confiance interne (§25) */
  const C = cfg.confidence;
  const photos = input.photos_count ?? 0;
  const aiAxes = score.axes_used.length;
  const totalAxes = Object.keys(cfg.property_score.axis_weights).length;
  const avgCompScore = used.length ? used.reduce((s, c) => s + c.score, 0) / used.length : 0;
  const factors = [
    { key: "rdna", label: "Données RDNA", points: isNum(rdnaAdr) ? C.weights.rdna : 0, max: C.weights.rdna, note: isNum(rdnaAdr) ? "Rapport importé et exploité" : "Aucun rapport RDNA" },
    { key: "comparables", label: "Nombre de comparables", points: Math.round(Math.min(used.length / C.comparables_target, 1) * C.weights.comparables), max: C.weights.comparables, note: `${used.length} comparables retenus` },
    { key: "comparables_quality", label: "Pertinence des comparables", points: Math.round((avgCompScore / 100) * C.weights.comparables_quality), max: C.weights.comparables_quality, note: used.length ? `Score moyen de similarité ${Math.round(avgCompScore)}/100` : "Aucun comparable" },
    { key: "photos", label: "Photos", points: Math.round(Math.min(photos / C.photos_target, 1) * C.weights.photos), max: C.weights.photos, note: `${photos} photos` },
    { key: "ai", label: "Analyse IA", points: Math.round((aiAxes / totalAxes) * C.weights.ai), max: C.weights.ai, note: `${aiAxes}/${totalAxes} axes analysés` },
    { key: "location", label: "Localisation", points: (isNum(input.lat) && isNum(input.lng) ? C.weights.location * 0.6 : 0) + (isNum(input.location_data?.distance_mer_m) || isNum(input.location_data?.distance_plage_m) ? C.weights.location * 0.4 : 0), max: C.weights.location, note: isNum(input.lat) ? "Coordonnées connues" : "Coordonnées manquantes" },
    { key: "coherence", label: "Cohérence des sources", points: verdict === "coherent" ? C.weights.coherence : verdict === "ecart" ? C.weights.coherence * 0.5 : verdict === "conflit" ? 0 : C.weights.coherence * 0.3, max: C.weights.coherence, note: verdict },
    { key: "completeness", label: "Complétude du dossier", points: Math.round(Math.max(0, 1 - unknowns.length / 6) * C.weights.completeness), max: C.weights.completeness, note: unknowns.length ? `${unknowns.length} donnée(s) inconnue(s)` : "Dossier complet" },
  ].map((f) => ({ ...f, points: Math.round(f.points) }));

  const confidenceScore = clamp(Math.round(factors.reduce((s, f) => s + f.points, 0)), 0, 100);

  // Fourchettes élargies si la confiance est faible (§23).
  if (confidenceScore < cfg.ranges.low_confidence_threshold) {
    const extra = cfg.ranges.low_confidence_extra_pct;
    (Object.keys(seasons) as SeasonKey[]).forEach((k) => {
      const s = seasons[k];
      if (s.price_recommended) {
        s.price_min = psychologicalPrice(s.price_recommended * (1 - (cfg.ranges.low_pct + extra) / 100), cfg);
        s.price_max = psychologicalPrice(s.price_recommended * (1 + (cfg.ranges.high_pct + extra) / 100), cfg);
      }
    });
    alerts.push({ level: "info", message: "Confiance faible : fourchettes élargies volontairement." });
  }

  const status: EngineOutput["status"] = isNum(optimal) && hasSeasonData ? "ok" : "insufficient_data";
  if (status === "insufficient_data") {
    alerts.push({
      level: "critical",
      message: "Données insuffisantes pour produire une estimation : importe un rapport RDNA ou ajoute des comparables exploitables.",
    });
  }

  return {
    version: cfg.version,
    computed_at: new Date().toISOString(),
    status,
    unknowns,
    alerts,
    market: {
      baseline_adr: { value: baselineAdr, source: isNum(rdnaAdr) && isNum(compsAdr) ? "CALCULATED" : isNum(rdnaAdr) ? "RDNA" : isNum(compsAdr) ? "WEB" : "UNKNOWN" },
      baseline_occupancy: { value: baselineOcc, source: isNum(rdnaOcc) ? "RDNA" : isNum(compsOcc) ? "WEB" : "UNKNOWN" },
      rdna_adr: rdnaAdr,
      rdna_occupancy: rdnaOcc,
      comparables_adr: compsAdr,
      comparables_occupancy: compsOcc,
      penetration: pen,
      sources_used: sourcesUsed,
    },
    comparables: comps,
    property_score: score,
    positioning: tier ? { key: tier.key, label: tier.label, price_factor: tier.price_factor } : null,
    adjustments,
    pricing: {
      reference_adr: referenceAdr,
      elasticity: el.value,
      elasticity_source: el.source,
      optimal_adr: optimal,
      optimal_adr_before_guardrails: optimalBefore,
      guardrail_applied: guardrail,
      curve,
    },
    seasons,
    annual: {
      nights_year: nightsYear,
      nights_blocked: blocked,
      nights_sellable: sellableYear,
      nights_booked: hasSeasonData ? bookedTotal : null,
      occupancy_pct: annualOcc !== null ? pct(annualOcc) : null,
      adr_weighted: adrWeighted,
      revenue: hasSeasonData ? revenueTotal : null,
      breakdown,
    },
    confidence: { score: confidenceScore, factors },
    coherence: {
      rdna_adr: rdnaAdr,
      comparables_adr: compsAdr,
      model_adr: modelAdr,
      max_divergence_pct: divergence,
      verdict,
    },
    trace,
  };
}

/** Applique les corrections manuelles (§27) au résultat du moteur, en gardant la valeur calculée. */
export interface ManualOverride {
  value: number;
  computed: number | null;
  at: string;
}
export type ManualOverrides = Record<string, ManualOverride>;

export function applyOverrides(out: EngineOutput, overrides: ManualOverrides | undefined, cfg = DEFAULT_ENGINE_CONFIG): EngineOutput {
  if (!overrides || !Object.keys(overrides).length) return out;
  const next: EngineOutput = JSON.parse(JSON.stringify(out));
  let recomputeAnnual = false;

  for (const [key, ov] of Object.entries(overrides)) {
    const [scope, field] = key.split(".");
    if (["basse", "moyenne", "haute"].includes(scope)) {
      const s = next.seasons[scope as SeasonKey];
      if (!s) continue;
      if (field === "price_recommended") {
        s.price_recommended = ov.value;
        s.price_min = psychologicalPrice(ov.value * (1 - cfg.ranges.low_pct / 100), cfg);
        s.price_max = psychologicalPrice(ov.value * (1 + cfg.ranges.high_pct / 100), cfg);
        recomputeAnnual = true;
      }
      if (field === "occupancy_pct") { s.occupancy_pct = ov.value; recomputeAnnual = true; }
      if (field === "price_min") s.price_min = ov.value;
      if (field === "price_max") s.price_max = ov.value;
    }
    if (scope === "annual" && field === "nights_blocked") {
      next.annual.nights_blocked = ov.value;
      next.annual.nights_sellable = Math.max(0, next.annual.nights_year - ov.value);
      recomputeAnnual = true;
    }
  }

  if (recomputeAnnual) {
    let booked = 0, revenue = 0;
    next.annual.breakdown = [];
    (["basse", "moyenne", "haute"] as SeasonKey[]).forEach((k) => {
      const s = next.seasons[k];
      s.nights_sellable = Math.max(0, Math.round(s.nights_total * (next.annual.nights_sellable / next.annual.nights_year)));
      if (s.price_recommended === null || s.occupancy_pct === null) return;
      s.nights_booked = Math.round((s.nights_sellable * s.occupancy_pct) / 100);
      s.revenue = Math.round(s.nights_booked * s.price_recommended);
      booked += s.nights_booked;
      revenue += s.revenue;
      next.annual.breakdown.push({
        label: s.label, nights: s.nights_sellable, occupancy_pct: s.occupancy_pct,
        adr: s.price_recommended, revenue: s.revenue,
      });
    });
    next.annual.nights_booked = booked;
    next.annual.revenue = revenue;
    next.annual.occupancy_pct = next.annual.nights_sellable > 0 ? pct(booked / next.annual.nights_sellable) : null;
    next.annual.adr_weighted = booked > 0 ? round2(revenue / booked) : null;
  }
  return next;
}

/** Données strictement transmissibles au futur rapport propriétaire (§32). */
export function toOwnerReportData(out: EngineOutput) {
  const season = (k: SeasonKey) => {
    const s = out.seasons[k];
    return {
      label: s.label,
      prix_recommande: s.price_recommended,
      fourchette: [s.price_min, s.price_max] as [number | null, number | null],
      occupation_pct: s.occupancy_pct,
    };
  };
  return {
    saisons: { basse: season("basse"), moyenne: season("moyenne"), haute: season("haute") },
    occupation_annuelle_pct: out.annual.occupancy_pct,
    adr_annuel: out.annual.adr_weighted,
    ca_annuel: out.annual.revenue,
    marche: {
      adr_marche: out.market.baseline_adr.value,
      occupation_marche: out.market.baseline_occupancy.value !== null ? pct(out.market.baseline_occupancy.value) : null,
    },
    comparables: out.comparables
      .filter((c) => c.used)
      .map((c) => ({ nom: c.name, prix_affiche: c.adr, occupation: c.occupancy !== null ? pct(c.occupancy) : null })),
    positionnement: out.positioning?.label ?? null,
    atouts: out.adjustments.items.filter((i) => i.applied_pct > 0).map((i) => i.label),
    points_de_vigilance: out.adjustments.items.filter((i) => i.applied_pct < 0).map((i) => i.label),
    // JAMAIS transmis : confiance interne, alertes internes, coefficients,
    // prix du ménage, élasticité, courbe d'optimisation, scores bruts.
  };
}

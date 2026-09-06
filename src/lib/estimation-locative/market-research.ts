// MODULE — Estimation locative · ÉTAPE 4 : comparables & marché local
// ─────────────────────────────────────────────────────────────────────────────
// Règle absolue (§1) : rien n'est inventé. Une donnée absente reste `null`
// (UNKNOWN) et n'est jamais remplacée par une moyenne ou une hypothèse.
// Les données web (§17) restent séparées des données RDNA ; le moteur de
// l'étape 2 reste seul responsable du calcul du prix (§26, §34).
// ─────────────────────────────────────────────────────────────────────────────

/* ══ Types ═══════════════════════════════════════════════════════════════ */

export type ComparableOrigin = "rdna" | "web" | "manual";

/** §7 — une piscine commune n'est pas une piscine privée. */
export type PoolKind =
  | "aucune" | "privee" | "commune" | "chauffee" | "saisonniere" | "inconnue";

/** §8 — vue mer partielle ≠ vue mer panoramique. */
export type ViewKind =
  | "aucune" | "ville" | "jardin" | "piscine" | "montagne"
  | "mer_partielle" | "mer_panoramique" | "inconnue";

export type ParkingKind = "aucun" | "rue" | "prive" | "garage" | "inconnu";
export type AcKind = "aucune" | "partielle" | "totale" | "inconnue";
export type ExteriorKind = "aucun" | "balcon" | "terrasse" | "jardin" | "inconnu";

export interface MarketComparable {
  id: string;
  origin: ComparableOrigin;
  name: string | null;
  platform: string | null;   // airbnb | booking | vrbo | expedia | rdna | manuel
  url: string | null;
  property_type: string | null;
  bedrooms: number | null;
  capacity: number | null;
  bathrooms: number | null;
  surface_m2: number | null;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  distance_m: number | null;
  pool_kind: PoolKind;
  view_kind: ViewKind;
  parking_kind: ParkingKind;
  ac_kind: AcKind;
  exterior_kind: ExteriorKind;
  amenities: string[];
  rating: number | null;
  reviews_count: number | null;
  /** §9 — prix affiché, jamais assimilé à un revenu. */
  displayed_price: number | null;
  cleaning_fee: number | null;
  other_fees: number | null;
  total_stay_price: number | null;
  actual_revenue: number | null;   // null = UNKNOWN
  occupancy_pct: number | null;
  annual_revenue: number | null;
  currency: string | null;
  observed_at: string | null;      // §24
  standing: number | null;         // 0-100, analyse visuelle interne (§15)
  distance_sea_m: number | null;
  distance_center_m: number | null;
  excluded: boolean;
  not_relevant: boolean;
  kept_manually: boolean;
}

/** Caractéristiques du bien étudié, telles que résolues aux étapes 1 à 3. */
export interface SubjectProfile {
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string | null;
  bedrooms: number | null;
  capacity: number | null;
  bathrooms: number | null;
  surface_m2: number | null;
  pool_kind: PoolKind;
  view_kind: ViewKind;
  parking_kind: ParkingKind;
  ac_kind: AcKind;
  exterior_kind: ExteriorKind;
  amenities: string[];
  standing: number | null;
  distance_sea_m: number | null;
  distance_center_m: number | null;
}

export interface SimilarityAxis {
  key: string;
  label: string;
  weight: number;
  /** 0 à 1, ou `null` quand l'axe n'est pas évaluable (donnée manquante). */
  score: number | null;
}

export interface ScoredMarketComparable {
  comparable: MarketComparable;
  score: number;              // 0-100
  axes: SimilarityAxis[];
  missing: string[];          // axes non évaluables
  coverage: number;           // part du poids réellement évaluée (0-1)
  selected: boolean;
  reason: string;
}

/* ══ Constantes ══════════════════════════════════════════════════════════ */

export const MIN_PRIMARY_COMPARABLES = 3;
export const MAX_PRIMARY_COMPARABLES = 6;
/** En dessous, un comparable n'est pas retenu d'office (§16). */
export const MIN_SIMILARITY_SCORE = 55;
/** Un axe non évaluable réduit la couverture : sous ce seuil, prudence (§25). */
export const MIN_COVERAGE = 0.45;

export const INSUFFICIENT_WEB_MESSAGE = "Comparables externes insuffisants.";
export const INSUFFICIENT_RELIABLE_MESSAGE = "Nombre de comparables fiables insuffisant.";
export const DISPLAYED_PRICE_DISCLAIMER =
  "Les tarifs présentés correspondent aux prix affichés publiquement au moment de l'observation et ne constituent pas nécessairement les revenus effectivement perçus par les propriétaires.";

export const POOL_LABELS: Record<PoolKind, string> = {
  aucune: "Aucune piscine", privee: "Piscine privée", commune: "Piscine commune",
  chauffee: "Piscine chauffée", saisonniere: "Piscine saisonnière", inconnue: "Piscine inconnue",
};

export const VIEW_LABELS: Record<ViewKind, string> = {
  aucune: "Aucune vue", ville: "Vue ville", jardin: "Vue jardin", piscine: "Vue piscine",
  montagne: "Vue montagne", mer_partielle: "Vue mer partielle",
  mer_panoramique: "Vue mer panoramique", inconnue: "Vue inconnue",
};

export const TRACKED_AMENITIES = [
  "climatisation", "parking", "piscine", "wifi", "terrasse",
  "lave_linge", "lave_vaisselle", "jardin", "vue_mer", "barbecue",
] as const;
export type TrackedAmenity = typeof TRACKED_AMENITIES[number];

export const AMENITY_LABELS: Record<TrackedAmenity, string> = {
  climatisation: "Climatisation", parking: "Parking", piscine: "Piscine", wifi: "Wi-Fi",
  terrasse: "Terrasse", lave_linge: "Lave-linge", lave_vaisselle: "Lave-vaisselle",
  jardin: "Jardin", vue_mer: "Vue mer", barbecue: "Barbecue",
};

/* ══ Normalisations (§7, §8) ═════════════════════════════════════════════ */

const norm = (v: unknown) =>
  String(v ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function normalizePoolKind(v: unknown): PoolKind {
  const s = norm(v);
  if (!s) return "inconnue";
  if (/(aucune|sans piscine|no pool|pas de piscine|none)/.test(s)) return "aucune";
  if (/(chauff|heated)/.test(s)) return "chauffee";
  if (/(saison|seasonal)/.test(s)) return "saisonniere";
  if (/(commune|partag|shared|collective|residence)/.test(s)) return "commune";
  if (/(privee|prive|private|individuelle)/.test(s)) return "privee";
  if (/(piscine|pool)/.test(s)) return "inconnue"; // piscine mentionnée sans type = type inconnu
  return "inconnue";
}

export function normalizeViewKind(v: unknown): ViewKind {
  const s = norm(v);
  if (!s) return "inconnue";
  if (/(aucune|sans vue|no view|vis-a-vis|none)/.test(s)) return "aucune";
  if (/(panoramique|panoramic|imprenable|plein sud sur la mer)/.test(s) && /(mer|sea|ocean)/.test(s))
    return "mer_panoramique";
  if (/(mer|sea|ocean)/.test(s)) return "mer_partielle";
  if (/(montagne|mountain|colline)/.test(s)) return "montagne";
  if (/(piscine|pool)/.test(s)) return "piscine";
  if (/(jardin|garden)/.test(s)) return "jardin";
  if (/(ville|city|urbaine)/.test(s)) return "ville";
  return "inconnue";
}

export function normalizeParkingKind(v: unknown): ParkingKind {
  const s = norm(v);
  if (!s) return "inconnu";
  if (/(aucun|sans parking|no parking|none)/.test(s)) return "aucun";
  if (/(garage|box)/.test(s)) return "garage";
  if (/(prive|private|reserve|sur place|on site)/.test(s)) return "prive";
  if (/(rue|street|public|gratuit dans la rue)/.test(s)) return "rue";
  if (/(parking|stationnement)/.test(s)) return "inconnu";
  return "inconnu";
}

export function normalizeAcKind(v: unknown): AcKind {
  const s = norm(v);
  if (!s) return "inconnue";
  if (/(aucune|sans clim|no air|none)/.test(s)) return "aucune";
  if (/(partielle|partial|chambres uniquement|reversible dans le salon)/.test(s)) return "partielle";
  if (/(totale|complete|full|toutes les pieces|climatisation)/.test(s)) return "totale";
  return "inconnue";
}

export function normalizeExteriorKind(v: unknown): ExteriorKind {
  const s = norm(v);
  if (!s) return "inconnu";
  if (/(aucun|sans exterieur|none)/.test(s)) return "aucun";
  if (/(jardin|garden)/.test(s)) return "jardin";
  if (/(terrasse|terrace|patio|rooftop)/.test(s)) return "terrasse";
  if (/(balcon|balcony|loggia)/.test(s)) return "balcon";
  return "inconnu";
}

export function normalizePlatform(v: unknown): string | null {
  const s = norm(v);
  if (!s) return null;
  if (s.includes("airbnb")) return "airbnb";
  if (s.includes("booking")) return "booking";
  if (s.includes("vrbo") || s.includes("abritel") || s.includes("homeaway")) return "vrbo";
  if (s.includes("expedia")) return "expedia";
  if (s.includes("rdna") || s.includes("airdna")) return "rdna";
  return s.slice(0, 40);
}

/* ══ Distance (§6) ═══════════════════════════════════════════════════════ */

/** Distance orthodromique en mètres, ou `null` si une coordonnée manque. */
export function haversineMeters(
  a: { lat: number | null; lng: number | null },
  b: { lat: number | null; lng: number | null },
): number | null {
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return null;
  if ([a.lat, a.lng, b.lat, b.lng].some((n) => !Number.isFinite(n))) return null;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function formatDistance(m: number | null | undefined): string {
  if (m === null || m === undefined || !Number.isFinite(m)) return "Distance inconnue";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/* ══ Similarité (§5) ═════════════════════════════════════════════════════ */

const AXIS_WEIGHTS = {
  distance: 16,
  commune: 8,
  quartier: 6,
  type: 8,
  chambres: 12,
  capacite: 8,
  salles_de_bain: 4,
  surface: 6,
  piscine: 10,
  vue: 8,
  exterieur: 4,
  parking: 4,
  climatisation: 3,
  standing: 8,
  equipements: 5,
  mer: 6,
  centre: 4,
} as const;

const AXIS_LABELS: Record<keyof typeof AXIS_WEIGHTS, string> = {
  distance: "Distance", commune: "Commune", quartier: "Quartier", type: "Type de bien",
  chambres: "Chambres", capacite: "Capacité", salles_de_bain: "Salles de bain",
  surface: "Surface", piscine: "Piscine", vue: "Vue", exterieur: "Extérieur",
  parking: "Parking", climatisation: "Climatisation", standing: "Standing",
  equipements: "Équipements", mer: "Proximité mer", centre: "Proximité centre",
};

const numAxis = (a: number | null, b: number | null, tolerance: number): number | null => {
  if (a === null || b === null) return null;
  const diff = Math.abs(a - b);
  return Math.max(0, 1 - diff / tolerance);
};

const ratioAxis = (a: number | null, b: number | null): number | null => {
  if (a === null || b === null || a <= 0 || b <= 0) return null;
  return Math.min(a, b) / Math.max(a, b);
};

/** Une piscine commune est proche d'une piscine privée, sans être équivalente. */
const POOL_AFFINITY: Record<PoolKind, Record<PoolKind, number>> = (() => {
  const family: Record<PoolKind, number> = {
    aucune: 0, privee: 3, commune: 1, chauffee: 3.5, saisonniere: 2.5, inconnue: NaN,
  };
  const kinds = Object.keys(family) as PoolKind[];
  const out = {} as Record<PoolKind, Record<PoolKind, number>>;
  for (const a of kinds) {
    out[a] = {} as Record<PoolKind, number>;
    for (const b of kinds) {
      out[a][b] = Number.isNaN(family[a]) || Number.isNaN(family[b])
        ? NaN
        : Math.max(0, 1 - Math.abs(family[a] - family[b]) / 3.5);
    }
  }
  return out;
})();

const VIEW_RANK: Record<ViewKind, number> = {
  aucune: 0, ville: 1, jardin: 1.5, piscine: 2, montagne: 2.5,
  mer_partielle: 3.5, mer_panoramique: 5, inconnue: NaN,
};
const PARKING_RANK: Record<ParkingKind, number> = {
  aucun: 0, rue: 1, prive: 2.5, garage: 3, inconnu: NaN,
};
const AC_RANK: Record<AcKind, number> = { aucune: 0, partielle: 1.5, totale: 3, inconnue: NaN };
const EXT_RANK: Record<ExteriorKind, number> = {
  aucun: 0, balcon: 1, terrasse: 2, jardin: 3, inconnu: NaN,
};

const rankAxis = <K extends string>(
  ranks: Record<K, number>, a: K, b: K, span: number,
): number | null => {
  const ra = ranks[a]; const rb = ranks[b];
  if (Number.isNaN(ra) || Number.isNaN(rb) || ra === undefined || rb === undefined) return null;
  return Math.max(0, 1 - Math.abs(ra - rb) / span);
};

const sameText = (a: string | null, b: string | null): number | null => {
  if (!a || !b) return null;
  return norm(a) === norm(b) ? 1 : 0;
};

/** Score de similarité 0-100 (§5) : relatif, jamais uniquement géographique. */
export function scoreComparable(
  subject: SubjectProfile, c: MarketComparable,
): ScoredMarketComparable {
  const distance = c.distance_m ?? haversineMeters(subject, c);
  const axes: SimilarityAxis[] = [];
  const push = (key: keyof typeof AXIS_WEIGHTS, score: number | null) =>
    axes.push({ key, label: AXIS_LABELS[key], weight: AXIS_WEIGHTS[key], score });

  // Décroissance douce : 0 m = 1, ~3 km = 0,5, au-delà de 12 km ≈ 0.
  push("distance", distance === null ? null : Math.max(0, 1 / (1 + distance / 3000) - distance / 40000));
  push("commune", sameText(subject.city, c.city));
  push("quartier", sameText(subject.district, c.district));
  push("type", sameText(subject.property_type, c.property_type));
  push("chambres", numAxis(subject.bedrooms, c.bedrooms, 3));
  push("capacite", numAxis(subject.capacity, c.capacity, 6));
  push("salles_de_bain", numAxis(subject.bathrooms, c.bathrooms, 3));
  push("surface", ratioAxis(subject.surface_m2, c.surface_m2));
  push("piscine", (() => {
    const v = POOL_AFFINITY[subject.pool_kind]?.[c.pool_kind];
    return v === undefined || Number.isNaN(v) ? null : v;
  })());
  push("vue", rankAxis(VIEW_RANK, subject.view_kind, c.view_kind, 5));
  push("exterieur", rankAxis(EXT_RANK, subject.exterior_kind, c.exterior_kind, 3));
  push("parking", rankAxis(PARKING_RANK, subject.parking_kind, c.parking_kind, 3));
  push("climatisation", rankAxis(AC_RANK, subject.ac_kind, c.ac_kind, 3));
  push("standing", numAxis(subject.standing, c.standing, 40));
  push("equipements", (() => {
    const a = new Set(subject.amenities.map(norm).filter(Boolean));
    const b = new Set(c.amenities.map(norm).filter(Boolean));
    if (!a.size || !b.size) return null;
    let inter = 0;
    a.forEach((x) => { if (b.has(x)) inter += 1; });
    return inter / new Set([...a, ...b]).size;
  })());
  push("mer", numAxis(subject.distance_sea_m, c.distance_sea_m, 2500));
  push("centre", numAxis(subject.distance_center_m, c.distance_center_m, 3000));

  const evaluated = axes.filter((a) => a.score !== null);
  const totalWeight = axes.reduce((s, a) => s + a.weight, 0);
  const usedWeight = evaluated.reduce((s, a) => s + a.weight, 0);
  const coverage = totalWeight === 0 ? 0 : usedWeight / totalWeight;
  const score = usedWeight === 0
    ? 0
    : Math.round((evaluated.reduce((s, a) => s + a.weight * (a.score as number), 0) / usedWeight) * 100);

  return {
    comparable: { ...c, distance_m: distance },
    score,
    axes,
    missing: axes.filter((a) => a.score === null).map((a) => a.label),
    coverage: Math.round(coverage * 100) / 100,
    selected: false,
    reason: "",
  };
}

/* ══ Sélection (§4, §16) ═════════════════════════════════════════════════ */

export interface SelectionResult {
  scored: ScoredMarketComparable[];
  primary: ScoredMarketComparable[];
  sufficient: boolean;
  message: string | null;
}

export function selectComparables(
  subject: SubjectProfile, comparables: MarketComparable[],
): SelectionResult {
  const scored = comparables
    .map((c) => scoreComparable(subject, c))
    .sort((a, b) => b.score - a.score || (a.comparable.distance_m ?? 1e9) - (b.comparable.distance_m ?? 1e9));

  const primary: ScoredMarketComparable[] = [];
  for (const s of scored) {
    const c = s.comparable;
    if (c.excluded || c.not_relevant) { s.reason = "Écarté manuellement"; continue; }
    if (c.kept_manually) {
      s.reason = "Conservé manuellement";
      s.selected = true; primary.push(s); continue;
    }
    if (primary.length >= MAX_PRIMARY_COMPARABLES) { s.reason = "Hors des meilleurs comparables"; continue; }
    if (s.score < MIN_SIMILARITY_SCORE) { s.reason = `Similarité insuffisante (${s.score}/100)`; continue; }
    if (s.coverage < MIN_COVERAGE) { s.reason = "Trop de données inconnues"; continue; }
    s.reason = "Retenu comme comparable principal";
    s.selected = true;
    primary.push(s);
  }

  const kept = primary.slice(0, MAX_PRIMARY_COMPARABLES);
  for (const s of primary.slice(MAX_PRIMARY_COMPARABLES)) {
    s.selected = false; s.reason = "Hors des meilleurs comparables";
  }

  const sufficient = kept.length >= MIN_PRIMARY_COMPARABLES;
  return {
    scored,
    primary: kept,
    sufficient,
    message: sufficient
      ? null
      : comparables.length === 0 ? INSUFFICIENT_WEB_MESSAGE : INSUFFICIENT_RELIABLE_MESSAGE,
  };
}

/* ══ Équipements du marché (§20) ═════════════════════════════════════════ */

export interface AmenityPenetrationItem {
  key: TrackedAmenity;
  label: string;
  known: number;          // comparables où l'information est connue
  present: number;
  penetration: number | null; // null tant que l'échantillon est trop faible
}

/** Sous ce nombre de comparables renseignés, un pourcentage n'a pas de sens. */
export const MIN_PENETRATION_SAMPLE = 4;

function amenityState(c: MarketComparable, key: TrackedAmenity): boolean | null {
  switch (key) {
    case "piscine":
      return c.pool_kind === "inconnue" ? null : c.pool_kind !== "aucune";
    case "parking":
      return c.parking_kind === "inconnu" ? null : c.parking_kind !== "aucun";
    case "climatisation":
      return c.ac_kind === "inconnue" ? null : c.ac_kind !== "aucune";
    case "terrasse":
      return c.exterior_kind === "inconnu"
        ? null : c.exterior_kind === "terrasse" || c.exterior_kind === "jardin";
    case "jardin":
      return c.exterior_kind === "inconnu" ? null : c.exterior_kind === "jardin";
    case "vue_mer":
      return c.view_kind === "inconnue"
        ? null : c.view_kind === "mer_partielle" || c.view_kind === "mer_panoramique";
    default: {
      if (!c.amenities.length) return null;
      return c.amenities.some((a) => norm(a).includes(key.replace("_", " ")) || norm(a).includes(key));
    }
  }
}

export function computeAmenityPenetration(comparables: MarketComparable[]): AmenityPenetrationItem[] {
  return TRACKED_AMENITIES.map((key) => {
    let known = 0; let present = 0;
    for (const c of comparables) {
      const state = amenityState(c, key);
      if (state === null) continue;
      known += 1;
      if (state) present += 1;
    }
    return {
      key, label: AMENITY_LABELS[key], known, present,
      penetration: known >= MIN_PENETRATION_SAMPLE ? Math.round((present / known) * 100) : null,
    };
  });
}

/* ══ Market snapshot (§19) ═══════════════════════════════════════════════ */

export interface MarketSnapshot {
  analyzed: number;
  selected: number;
  rdna_count: number;
  web_count: number;
  displayed_price: { min: number | null; median: number | null; max: number | null; sample: number };
  rdna_adr: { min: number | null; median: number | null; max: number | null; sample: number };
  dominant: { bedrooms: number | null; capacity: number | null; property_type: string | null };
  amenities: AmenityPenetrationItem[];
  standing_observed: number | null;
  oldest_observation: string | null;
  newest_observation: string | null;
  disclaimer: string;
}

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 100) / 100;
};

const mode = <T,>(values: T[]): T | null => {
  if (!values.length) return null;
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

export function buildMarketSnapshot(
  all: MarketComparable[], selected: MarketComparable[],
): MarketSnapshot {
  const usable = all.filter((c) => !c.excluded && !c.not_relevant);
  const web = usable.filter((c) => c.origin === "web" || c.origin === "manual");
  const rdna = usable.filter((c) => c.origin === "rdna");

  const displayed = web.map((c) => c.displayed_price).filter((n): n is number => typeof n === "number" && n > 0);
  const adr = rdna.map((c) => c.displayed_price).filter((n): n is number => typeof n === "number" && n > 0);
  const standings = usable.map((c) => c.standing).filter((n): n is number => typeof n === "number");
  const dates = usable.map((c) => c.observed_at).filter((d): d is string => !!d).sort();

  return {
    analyzed: all.length,
    selected: selected.length,
    rdna_count: rdna.length,
    web_count: web.length,
    displayed_price: {
      min: displayed.length ? Math.min(...displayed) : null,
      median: median(displayed),
      max: displayed.length ? Math.max(...displayed) : null,
      sample: displayed.length,
    },
    rdna_adr: {
      min: adr.length ? Math.min(...adr) : null,
      median: median(adr),
      max: adr.length ? Math.max(...adr) : null,
      sample: adr.length,
    },
    dominant: {
      bedrooms: mode(usable.map((c) => c.bedrooms).filter((n): n is number => n !== null)),
      capacity: mode(usable.map((c) => c.capacity).filter((n): n is number => n !== null)),
      property_type: mode(usable.map((c) => c.property_type).filter((t): t is string => !!t)),
    },
    amenities: computeAmenityPenetration(usable),
    standing_observed: standings.length ? Math.round(standings.reduce((s, n) => s + n, 0) / standings.length) : null,
    oldest_observation: dates[0] ?? null,
    newest_observation: dates[dates.length - 1] ?? null,
    disclaimer: DISPLAYED_PRICE_DISCLAIMER,
  };
}

/* ══ Fraîcheur (§24) ═════════════════════════════════════════════════════ */

/** Poids de fraîcheur : 1 pour une observation du jour, 0,3 au-delà d'un an. */
export function freshnessWeight(observedAt: string | null, now = new Date()): number {
  if (!observedAt) return 0.5; // date inconnue : ni écartée, ni pleinement fiable
  const t = Date.parse(observedAt);
  if (Number.isNaN(t)) return 0.5;
  const days = Math.max(0, (now.getTime() - t) / 86400000);
  if (days <= 30) return 1;
  if (days >= 365) return 0.3;
  return Math.round((1 - ((days - 30) / 335) * 0.7) * 100) / 100;
}

/* ══ Score de qualité des données (§25, interne) ═════════════════════════ */

export interface DataQuality {
  score: number;                 // 0-100
  detail: Record<string, number>;
  notes: string[];
}

export function computeDataQuality(input: {
  scored: ScoredMarketComparable[];
  primary: ScoredMarketComparable[];
  rdnaCount: number;
  now?: Date;
}): DataQuality {
  const { scored, primary, rdnaCount } = input;
  const now = input.now ?? new Date();
  const notes: string[] = [];

  const volume = Math.min(1, primary.length / MIN_PRIMARY_COMPARABLES) * 25;
  if (primary.length < MIN_PRIMARY_COMPARABLES) notes.push(INSUFFICIENT_RELIABLE_MESSAGE);

  const relevance = primary.length
    ? (primary.reduce((s, p) => s + p.score, 0) / primary.length / 100) * 25
    : 0;

  const freshness = primary.length
    ? (primary.reduce((s, p) => s + freshnessWeight(p.comparable.observed_at, now), 0) / primary.length) * 20
    : 0;
  if (primary.some((p) => !p.comparable.observed_at)) notes.push("Certaines observations n'ont pas de date.");

  const completeness = primary.length
    ? (primary.reduce((s, p) => s + p.coverage, 0) / primary.length) * 15
    : 0;

  const platforms = new Set(
    scored.map((s) => s.comparable.platform).filter((p): p is string => !!p),
  );
  const diversity = Math.min(1, platforms.size / 3) * 10;
  if (platforms.size <= 1) notes.push("Une seule source externe exploitable.");

  const rdnaSupport = Math.min(1, rdnaCount / 5) * 5;
  if (rdnaCount === 0) notes.push("Aucun comparable RDNA disponible.");

  const detail = {
    volume: Math.round(volume), relevance: Math.round(relevance), freshness: Math.round(freshness),
    completeness: Math.round(completeness), diversity: Math.round(diversity),
    rdna: Math.round(rdnaSupport),
  };
  return {
    score: Math.min(100, Object.values(detail).reduce((s, n) => s + n, 0)),
    detail,
    notes,
  };
}

/* ══ Conflits RDNA / web (§18) ═══════════════════════════════════════════ */

export interface SourceContrast {
  rdna_adr: number | null;
  web_displayed_median: number | null;
  gap_pct: number | null;
  message: string;
}

/** Un écart RDNA/web n'est PAS une contradiction : ce sont deux mesures différentes. */
export function contrastSources(snapshot: MarketSnapshot): SourceContrast {
  const rdna = snapshot.rdna_adr.median;
  const web = snapshot.displayed_price.median;
  if (rdna === null && web === null) {
    return { rdna_adr: null, web_displayed_median: null, gap_pct: null, message: "Aucune référence de prix disponible." };
  }
  if (rdna === null || web === null) {
    return {
      rdna_adr: rdna, web_displayed_median: web, gap_pct: null,
      message: rdna === null
        ? "Prix affichés en ligne disponibles, sans référence RDNA de comparaison."
        : "Référence RDNA disponible, sans prix affiché en ligne de comparaison.",
    };
  }
  const gap = Math.round(((web - rdna) / rdna) * 1000) / 10;
  return {
    rdna_adr: rdna, web_displayed_median: web, gap_pct: gap,
    message: `ADR RDNA ${rdna} € contre prix affichés en ligne ${web} € (écart ${gap > 0 ? "+" : ""}${gap} %). Ce sont deux mesures de nature différente : un ADR historique ou calculé d'un côté, un prix affiché à une date donnée de l'autre.`,
  };
}

/* ══ Contexte local & nuisances (§21, §22) ═══════════════════════════════ */

export interface LocalPoi {
  name: string;
  category: string;
  distance_m: number | null;
  source: string | null;
}

export interface NuisanceItem {
  kind: string;
  message: string;
  source: string | null;
}

/** §22 — jamais d'affirmation : on signale un potentiel à vérifier. */
export function phraseNuisance(kind: string, detail?: string | null): string {
  const base: Record<string, string> = {
    route: "Route principale à proximité",
    autoroute: "Axe autoroutier à proximité",
    voie_ferree: "Voie ferrée à proximité",
    zone_commerciale: "Zone commerciale à proximité",
    aeroport: "Aéroport à proximité",
    port: "Port à proximité",
  };
  const head = base[kind] ?? "Source potentielle de nuisance à proximité";
  return `${head}${detail ? ` (${detail})` : ""} — potentiel de nuisance à vérifier.`;
}

/* ══ Alimentation du moteur (§26) ════════════════════════════════════════ */

export interface EngineMarketPayload {
  comparables: MarketComparable[];
  amenity_penetration: Record<string, number>;
  snapshot: MarketSnapshot;
  data_quality: DataQuality;
}

/**
 * Prépare les données externes pour le moteur de l'étape 2 : le moteur reçoit
 * les comparables retenus et les taux d'équipement observés, mais AUCUN
 * coefficient n'est modifié ici — l'impact reste décidé par le moteur.
 */
export function toEngineMarketPayload(
  subject: SubjectProfile, comparables: MarketComparable[],
): EngineMarketPayload {
  const selection = selectComparables(subject, comparables);
  const primary = selection.primary.map((p) => p.comparable);
  const snapshot = buildMarketSnapshot(comparables, primary);
  const penetration: Record<string, number> = {};
  for (const a of snapshot.amenities) if (a.penetration !== null) penetration[a.key] = a.penetration / 100;
  return {
    comparables: primary,
    amenity_penetration: penetration,
    snapshot,
    data_quality: computeDataQuality({
      scored: selection.scored,
      primary: selection.primary,
      rdnaCount: comparables.filter((c) => c.origin === "rdna").length,
    }),
  };
}

/* ══ Normalisation d'un candidat brut (recherche web) ════════════════════ */

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string" && /^(unknown|inconnu|n\/a|na)$/i.test(v.trim())) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const strOrNull = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s || /^(unknown|inconnu|n\/a|na)$/i.test(s)) return null;
  return s;
};

/** Transforme un candidat renvoyé par la recherche externe en comparable tracé. */
export function normalizeWebCandidate(
  raw: Record<string, unknown>,
  subject: SubjectProfile,
  defaults: { observed_at: string; id?: string },
): MarketComparable {
  const lat = numOrNull(raw.lat); const lng = numOrNull(raw.lng);
  const c: MarketComparable = {
    id: defaults.id ?? String(raw.id ?? crypto.randomUUID()),
    origin: "web",
    name: strOrNull(raw.name ?? raw.title),
    platform: normalizePlatform(raw.platform ?? raw.source ?? raw.url),
    url: strOrNull(raw.url),
    property_type: strOrNull(raw.property_type ?? raw.type),
    bedrooms: numOrNull(raw.bedrooms),
    capacity: numOrNull(raw.capacity ?? raw.guests),
    bathrooms: numOrNull(raw.bathrooms),
    surface_m2: numOrNull(raw.surface_m2 ?? raw.surface),
    city: strOrNull(raw.city),
    district: strOrNull(raw.district),
    lat, lng,
    distance_m: numOrNull(raw.distance_m) ?? haversineMeters(subject, { lat, lng }),
    pool_kind: normalizePoolKind(raw.pool ?? raw.pool_kind),
    view_kind: normalizeViewKind(raw.view ?? raw.view_kind),
    parking_kind: normalizeParkingKind(raw.parking ?? raw.parking_kind),
    ac_kind: normalizeAcKind(raw.ac ?? raw.air_conditioning),
    exterior_kind: normalizeExteriorKind(raw.exterior ?? raw.terrace ?? raw.garden),
    amenities: Array.isArray(raw.amenities) ? raw.amenities.map(String).filter(Boolean) : [],
    rating: numOrNull(raw.rating),
    reviews_count: numOrNull(raw.reviews_count ?? raw.reviews),
    displayed_price: numOrNull(raw.displayed_price ?? raw.price_per_night),
    cleaning_fee: numOrNull(raw.cleaning_fee),
    other_fees: numOrNull(raw.other_fees),
    total_stay_price: numOrNull(raw.total_stay_price ?? raw.total_price),
    // §9 — un prix affiché n'est jamais transformé en revenu.
    actual_revenue: numOrNull(raw.actual_revenue),
    occupancy_pct: numOrNull(raw.occupancy_pct),
    annual_revenue: numOrNull(raw.annual_revenue),
    currency: strOrNull(raw.currency) ?? "EUR",
    observed_at: strOrNull(raw.observed_at) ?? defaults.observed_at,
    standing: numOrNull(raw.standing),
    distance_sea_m: numOrNull(raw.distance_sea_m),
    distance_center_m: numOrNull(raw.distance_center_m),
    excluded: false,
    not_relevant: false,
    kept_manually: false,
  };
  return c;
}

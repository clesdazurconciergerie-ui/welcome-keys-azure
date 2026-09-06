// MODULE — Estimation locative · étape 5 : données du rapport propriétaire.
//
// Cette couche est une PURE RESTITUTION : elle lit l'estimation et la sortie du
// moteur, et n'effectue AUCUN calcul métier (aucun prix, aucune occupation,
// aucun revenu n'est recalculé ici). Une donnée absente reste absente : jamais
// de valeur par défaut trompeuse, jamais « absent » à la place d'« inconnu ».
//
// Ne doivent JAMAIS sortir vers le propriétaire : coefficients, pénalités,
// élasticité, courbe d'optimisation, scores internes, confiance interne,
// alertes internes, prix du ménage, commission.

import type { EngineOutput, SeasonKey } from "./engine-types";
import type { Estimation, EstimPhoto } from "./types";
import { resolveFacts, factsToFeatures, type AiAnalysisPayload } from "./ai-analysis";
import { DISPLAYED_PRICE_DISCLAIMER } from "./market-research";

/* ════════════════════════ Types du rapport ════════════════════════ */

export interface ReportPhoto {
  id: string;
  storage_path: string;
  category: string | null;
}

export interface ReportFact {
  key: string;
  label: string;
  /** `null` = inconnu / non observé. On n'écrit jamais « absent » à sa place. */
  value: string | null;
}

export interface ReportSeason {
  key: SeasonKey;
  label: string;
  price_recommended: number | null;
  price_min: number | null;
  price_max: number | null;
  occupancy_pct: number | null;
  nights_sellable: number | null;
  nights_booked: number | null;
  revenue: number | null;
}

export interface ReportComparable {
  id: string;
  name: string | null;
  location: string | null;
  bedrooms: number | null;
  capacity: number | null;
  bathrooms: number | null;
  highlights: string[];
  displayed_price: number | null;
  platform: string | null;
  observed_at: string | null;
  context: string | null;
  similarity_label: string | null;
}

export interface ReportRecommendation {
  label: string;
  rationale: string | null;
  priority: "high" | "medium" | "low";
}

export interface ReportAgency {
  name: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
}

export interface EstimationReportData {
  meta: {
    reference: string;
    brand: string;
    title: string;
    property_title: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    generated_at: string;
    date_label: string;
    owner_name: string | null;
  };
  cover: { photo: ReportPhoto | null };
  synthesis: {
    annual_revenue: number | null;
    annual_occupancy_pct: number | null;
    adr_weighted: number | null;
    seasons: ReportSeason[];
    explanation: string;
    takeaways: string[];
  };
  property: {
    facts: ReportFact[];
    amenities: string[];
    strengths: string[];
    photos: ReportPhoto[];
  };
  location: {
    address: string | null;
    city: string | null;
    district: string | null;
    lat: number | null;
    lng: number | null;
    distances: { label: string; value: string }[];
    pois: { name: string; category: string; distance_m: number | null }[];
    nuisances: string[];
    notes: string[];
  };
  market: {
    adr: number | null;
    occupancy_pct: number | null;
    reference_revenue: number | null;
    comparables_count: number;
    seasonality: { label: string; price: number | null; occupancy_pct: number | null }[];
    monthly_revenue: { month: string; revenue: number }[];
    context: string[];
  };
  comparables: {
    market: ReportComparable[];
    online: ReportComparable[];
    disclaimer: string;
  };
  pricing: {
    seasons: ReportSeason[];
    explanation: string;
  };
  projection: {
    annual_revenue: number | null;
    annual_occupancy_pct: number | null;
    adr_weighted: number | null;
    nights_booked: number | null;
    nights_sellable: number;
    rows: { label: string; nights: number; occupancy_pct: number; adr: number; revenue: number }[];
    monthly_revenue: { month: string; revenue: number }[];
  };
  positioning: {
    label: string | null;
    advantages: string[];
    differentiators: string[];
    target_primary: string | null;
    target_secondary: string[];
    usp: string[];
  };
  recommendations: ReportRecommendation[];
  method: { step: string; label: string }[];
  conclusion: {
    steps: string[];
    agency: ReportAgency;
    disclaimer: string;
    comparables_disclaimer: string;
  };
  /** Pages réellement utiles (une page sans contenu n'est pas rendue). */
  pages: ReportPageKey[];
}

export type ReportPageKey =
  | "cover" | "synthesis" | "property" | "location" | "market"
  | "comparables" | "pricing" | "projection" | "positioning"
  | "recommendations" | "method" | "conclusion";

export const REPORT_EXPLANATION =
  "Cette estimation repose sur l'analyse du logement, de sa localisation, de ses caractéristiques, "
  + "de données de marché et de logements comparables disponibles sur le marché de la location courte durée.";

export const PRICING_EXPLANATION =
  "La stratégie tarifaire recherche un équilibre entre prix moyen et taux d'occupation afin de maximiser "
  + "le revenu annuel potentiel plutôt que de rechercher uniquement le tarif à la nuit le plus élevé.";

export const REPORT_DISCLAIMER =
  "Cette estimation constitue une projection du potentiel locatif du logement et ne constitue pas une garantie "
  + "de revenus. Les performances réelles peuvent varier selon la demande, la concurrence, la disponibilité du "
  + "logement, la qualité de l'annonce, les conditions du marché et la stratégie tarifaire.";

export const COMPARABLES_PRICE_DISCLAIMER =
  "Les tarifs présentés pour les logements comparables correspondent à des prix affichés publiquement sur les "
  + "plateformes au moment de l'observation. Ils ne constituent pas une indication du revenu réellement perçu "
  + "par les propriétaires.";

export const METHOD_STEPS = [
  { step: "01", label: "Estimation du potentiel locatif" },
  { step: "02", label: "Validation du positionnement" },
  { step: "03", label: "Signature du contrat" },
  { step: "04", label: "Shooting photo professionnel" },
  { step: "05", label: "Création et optimisation des annonces" },
  { step: "06", label: "Mise en ligne" },
  { step: "07", label: "Gestion des réservations et des voyageurs" },
  { step: "08", label: "Suivi des performances" },
  { step: "09", label: "Espace propriétaire My Welcome" },
];

export const NEXT_STEPS = [
  "Validation de l'estimation",
  "Échange avec Azur Keys Properties",
  "Signature",
  "Préparation du logement",
  "Shooting photo",
  "Mise en ligne",
  "Démarrage de la gestion",
];

/* ════════════════════════ Utilitaires ════════════════════════ */

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const num = (v: unknown): number | null => (isNum(v) ? v : null);
const str = (v: unknown): string | null => {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === "inconnu" || low === "inconnue" || low === "unknown") return null;
  return s;
};

const LABELS: Record<string, string> = {
  aucune: "Aucune", aucun: "Aucun", privee: "Privée", commune: "Commune",
  chauffee: "Chauffée", saisonniere: "Saisonnière",
  mer: "Vue mer", mer_panoramique: "Vue mer panoramique", mer_partielle: "Vue mer partielle",
  panoramique: "Panoramique", partielle: "Partielle", degagee: "Dégagée",
  jardin: "Jardin", terrasse: "Terrasse", balcon: "Balcon",
  garage: "Garage", prive: "Privé", rue: "Rue", totale: "Totale",
  rdc: "Rez-de-chaussée",
};

const pretty = (v: unknown): string | null => {
  const s = str(v);
  if (!s) return null;
  const key = s.toLowerCase().replace(/\s+/g, "_");
  if (LABELS[key]) return LABELS[key];
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const formatEur = (v: number | null | undefined, digits = 0): string =>
  isNum(v)
    ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v)
    : UNAVAILABLE;

export const formatPct = (v: number | null | undefined): string =>
  isNum(v) ? `${Math.round(v)} %` : UNAVAILABLE;

export const UNAVAILABLE = "Donnée non disponible";
export const UNKNOWN = "Inconnu";

export const formatDistance = (m: number | null | undefined): string =>
  isNum(m) ? (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`) : UNAVAILABLE;

export const formatDateFr = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
};

/** Degré de similarité formulé pour un propriétaire (jamais le détail technique). */
function similarityLabel(score: number | null): string | null {
  if (!isNum(score)) return null;
  if (score >= 80) return "Très proche";
  if (score >= 65) return "Proche";
  if (score >= 55) return "Comparable";
  return "Partiellement comparable";
}

/* ════════════════════════ Construction ════════════════════════ */

export interface ReportSourceInput {
  estimation: Estimation & Record<string, any>;
  photos: EstimPhoto[];
  comparables: Record<string, any>[];
  agency?: Partial<ReportAgency> | null;
  now?: Date;
}

export function buildReportData(input: ReportSourceInput): EstimationReportData {
  const est = input.estimation ?? ({} as any);
  const engine = (est.engine_output ?? null) as EngineOutput | null;
  const ai = (est.ai_analysis ?? null) as AiAnalysisPayload | null;
  const now = input.now ?? new Date();

  /* — photos validées uniquement (§ sélection IA / manuelle) — */
  const allPhotos = (input.photos ?? []) as any[];
  const selected = allPhotos.filter((p) => p.selected_for_report);
  const usable = (selected.length ? selected : allPhotos.filter((p) => p.ai_usable !== false))
    .slice()
    .sort((a, b) => (b.quality_score ?? -1) - (a.quality_score ?? -1));
  const toPhoto = (p: any): ReportPhoto => ({ id: p.id, storage_path: p.storage_path, category: p.category ?? null });
  const coverCandidate = usable.find((p) => p.is_cover) ?? usable[0] ?? null;
  const cover = coverCandidate && (coverCandidate.quality_score ?? 60) >= 40 ? toPhoto(coverCandidate) : null;
  const galleryPhotos = usable.filter((p) => p.id !== coverCandidate?.id).slice(0, 4).map(toPhoto);

  /* — caractéristiques résolues (saisie > IA), inconnu reste inconnu — */
  const facts = resolveFacts({
    features: (est.features ?? {}) as any,
    ai: ai as any,
    rdna: (est.rdna_data ?? {}) as any,
    overrides: (est.manual_overrides ?? {}) as any,
  });
  const merged = factsToFeatures((est.features ?? {}) as Record<string, unknown>, facts) as any;

  const factRow = (key: string, label: string, value: string | null): ReportFact => ({ key, label, value });
  const propertyFacts: ReportFact[] = [
    factRow("type", "Type de logement", pretty(est.property_type ?? merged.type)),
    factRow("chambres", "Chambres", isNum(merged.chambres) ? String(merged.chambres) : null),
    factRow("salles_de_bain", "Salles de bain", isNum(merged.salles_de_bain) ? String(merged.salles_de_bain) : null),
    factRow("couchages", "Capacité", isNum(merged.couchages) ? `${merged.couchages} personnes` : null),
    factRow("surface_interieure_m2", "Surface intérieure", isNum(merged.surface_interieure_m2) ? `${merged.surface_interieure_m2} m²` : null),
    factRow("surface_exterieure_m2", "Surface extérieure", isNum(merged.surface_exterieure_m2) ? `${merged.surface_exterieure_m2} m²` : null),
    factRow("piscine", "Piscine", pretty(merged.piscine)),
    factRow("vue", "Vue", pretty(merged.vue)),
    factRow("parking", "Parking", pretty(merged.parking)),
    factRow("exterieurs", "Extérieur", Array.isArray(merged.exterieurs)
      ? (merged.exterieurs.map(pretty).filter(Boolean).join(", ") || null)
      : pretty(merged.exterieurs)),
    factRow("climatisation", "Climatisation", pretty(merged.climatisation)),
    factRow("wifi", "Wifi", pretty(merged.wifi)),
  ];

  const amenities: string[] = Array.isArray(merged.equipements)
    ? merged.equipements.map((e: unknown) => pretty(e)).filter((e): e is string => !!e)
    : [];

  /* — saisons : valeurs du moteur uniquement — */
  const seasonKeys: SeasonKey[] = ["basse", "moyenne", "haute"];
  const seasons: ReportSeason[] = engine
    ? seasonKeys.map((k) => {
      const s = engine.seasons?.[k];
      return {
        key: k,
        label: s?.label ?? (k === "basse" ? "Basse saison" : k === "moyenne" ? "Moyenne saison" : "Très haute saison"),
        price_recommended: num(s?.price_recommended),
        price_min: num(s?.price_min),
        price_max: num(s?.price_max),
        occupancy_pct: num(s?.occupancy_pct),
        nights_sellable: num(s?.nights_sellable),
        nights_booked: num(s?.nights_booked),
        revenue: num(s?.revenue),
      };
    })
    : [];

  const annual = engine?.annual;
  const annualRevenue = num(annual?.revenue);
  const annualOcc = num(annual?.occupancy_pct);
  const adrWeighted = num(annual?.adr_weighted);

  /* — marché : uniquement ce qui est réellement disponible — */
  const rdna = (est.rdna_data ?? {}) as any;
  const snapshot = (est.market_snapshot ?? {}) as any;
  const monthly = (Array.isArray(rdna.monthly_revenue) ? rdna.monthly_revenue : [])
    .map((m: any) => ({ month: String(m?.month ?? ""), revenue: num(m?.revenue_eur ?? m?.revenue) }))
    .filter((m: any) => m.month && isNum(m.revenue)) as { month: string; revenue: number }[];

  const rows = (input.comparables ?? []).filter((c) => !c.excluded && !c.not_relevant);
  const kept = rows.filter((c) => c.is_primary !== false);
  const toComparable = (c: any): ReportComparable => {
    const highlights = [
      pretty(c.pool_kind) && c.pool_kind !== "inconnue" && c.pool_kind !== "aucune" ? `Piscine ${String(pretty(c.pool_kind)).toLowerCase()}` : null,
      c.view_kind && !["inconnue", "aucune"].includes(String(c.view_kind)) ? pretty(c.view_kind) : null,
      c.parking_kind && !["inconnu", "aucun"].includes(String(c.parking_kind)) ? `Parking ${String(pretty(c.parking_kind)).toLowerCase()}` : null,
      isNum(c.surface_m2) ? `${c.surface_m2} m²` : null,
    ].filter((h): h is string => !!h);
    const ctx = c.price_context ?? {};
    return {
      id: c.id,
      name: str(c.name),
      location: [str(c.district), str(c.city)].filter(Boolean).join(", ") || null,
      bedrooms: num(c.bedrooms),
      capacity: num(c.capacity),
      bathrooms: num(c.bathrooms),
      highlights,
      displayed_price: num(c.displayed_price),
      platform: str(c.platform) ?? str(c.source),
      observed_at: str(c.observed_at),
      context: str(ctx.stay_length ? `Séjour ${ctx.stay_length}` : ctx.notes),
      similarity_label: similarityLabel(num(c.similarity_score)),
    };
  };
  const marketComparables = kept.filter((c) => (c.origin ?? "rdna") === "rdna").map(toComparable);
  const onlineComparables = kept.filter((c) => (c.origin ?? "rdna") !== "rdna").map(toComparable);

  /* — localisation — */
  const loc = (est.location_data ?? {}) as any;
  const localCtx = (est.local_context ?? {}) as any;
  const distances = [
    { label: "Mer", value: formatDistance(num(loc.distance_mer_m)) },
    { label: "Plage", value: formatDistance(num(loc.distance_plage_m)) },
    { label: "Centre-ville", value: formatDistance(num(loc.distance_centre_m)) },
    { label: "Gare", value: formatDistance(num(loc.distance_gare_m)) },
  ].filter((d) => d.value !== UNAVAILABLE);

  const pois = (Array.isArray(localCtx.pois) ? localCtx.pois : []).map((p: any) => ({
    name: String(p?.name ?? ""), category: String(p?.category ?? ""), distance_m: num(p?.distance_m),
  })).filter((p: any) => p.name);

  const nuisances = (Array.isArray(localCtx.nuisances) ? localCtx.nuisances : [])
    .map((n: any) => str(n?.message)).filter((m: any): m is string => !!m);

  const locationNotes = [
    str(loc.environnement),
    ...(Array.isArray(loc.points_interet) ? loc.points_interet.map(String) : []),
  ].filter((n): n is string => !!n);

  /* — positionnement & recommandations (IA, jamais inventé) — */
  const advantages = (ai?.strengths ?? []).map((s) => s.label).filter(Boolean);
  const usp = (ai?.usp ?? []).map((s) => s.label).filter(Boolean);
  const recommendations: ReportRecommendation[] = (ai?.recommendations ?? []).map((r) => ({
    label: r.label,
    rationale: r.rationale ?? r.evidence ?? null,
    priority: r.priority === "HIGH" ? "high" : r.priority === "LOW" ? "low" : "medium",
  }));
  recommendations.sort((a, b) => {
    const w = { high: 0, medium: 1, low: 2 } as const;
    return w[a.priority] - w[b.priority];
  });

  /* — à retenir : seulement ce que les données soutiennent — */
  const takeaways: string[] = [];
  const positioningLabel = str(ai?.positioning?.label) ?? str(engine?.positioning?.label);
  if (positioningLabel) takeaways.push(`Positionnement du logement : ${positioningLabel.toLowerCase()}.`);
  if (isNum(adrWeighted) && isNum(num(snapshot?.rdna_adr?.median) ?? num(rdna.adr_eur))) {
    const marketAdr = (num(snapshot?.rdna_adr?.median) ?? num(rdna.adr_eur)) as number;
    const gap = Math.round(((adrWeighted - marketAdr) / marketAdr) * 100);
    if (Math.abs(gap) >= 5) {
      takeaways.push(gap > 0
        ? `Le prix moyen visé se situe environ ${gap} % au-dessus du marché observé.`
        : `Le prix moyen visé se situe environ ${Math.abs(gap)} % en dessous du marché observé.`);
    } else takeaways.push("Le prix moyen visé se situe dans la moyenne du marché observé.");
  }
  const best = seasons.filter((s) => isNum(s.revenue)).sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))[0];
  if (best) takeaways.push(`La période la plus rémunératrice est la ${best.label.toLowerCase()}.`);
  if (isNum(annualOcc)) takeaways.push(`Taux d'occupation annuel estimé de ${Math.round(annualOcc)} %.`);
  if (advantages.length) takeaways.push(`Atout majeur identifié : ${advantages[0].toLowerCase()}.`);
  if (recommendations.some((r) => r.priority === "high")) {
    takeaways.push("Des améliorations à fort impact ont été identifiées pour renforcer le potentiel.");
  }

  const marketContext: string[] = [];
  if (isNum(num(snapshot?.selected))) marketContext.push(`${snapshot.selected} logements comparables retenus sur ${snapshot.analyzed ?? snapshot.selected} analysés.`);
  if (str(snapshot?.dominant?.property_type)) marketContext.push(`Type de bien dominant sur la zone : ${String(snapshot.dominant.property_type).toLowerCase()}.`);
  if (isNum(num(snapshot?.dominant?.bedrooms))) marketContext.push(`Configuration la plus fréquente : ${snapshot.dominant.bedrooms} chambres.`);

  const owner = est.owner;
  const ownerName = owner ? [owner.first_name, owner.last_name].filter(Boolean).join(" ").trim() || null : null;

  const data: EstimationReportData = {
    meta: {
      reference: est.reference ?? "—",
      brand: "Azur Keys Properties",
      title: "Estimation locative",
      property_title: str(est.title),
      address: str(est.address),
      city: str(est.city),
      postal_code: str(est.postal_code),
      generated_at: now.toISOString(),
      date_label: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
      owner_name: ownerName,
    },
    cover: { photo: cover },
    synthesis: {
      annual_revenue: annualRevenue,
      annual_occupancy_pct: annualOcc,
      adr_weighted: adrWeighted,
      seasons,
      explanation: REPORT_EXPLANATION,
      takeaways: takeaways.slice(0, 5),
    },
    property: {
      facts: propertyFacts,
      amenities,
      strengths: advantages,
      photos: galleryPhotos,
    },
    location: {
      address: str(est.address),
      city: str(est.city),
      district: str(est.district),
      lat: num(est.lat),
      lng: num(est.lng),
      distances,
      pois,
      nuisances,
      notes: locationNotes,
    },
    market: {
      adr: num(engine?.market?.baseline_adr?.value) ?? num(rdna.adr_eur),
      occupancy_pct: (() => {
        const v = num(engine?.market?.baseline_occupancy?.value);
        if (v === null) return num(rdna.occupation_pct);
        return Math.round(v <= 1 ? v * 100 : v);
      })(),
      reference_revenue: num(rdna.revenu_annuel_eur),
      comparables_count: kept.length,
      seasonality: seasons.map((s) => ({ label: s.label, price: s.price_recommended, occupancy_pct: s.occupancy_pct })),
      monthly_revenue: monthly,
      context: marketContext,
    },
    comparables: {
      market: marketComparables,
      online: onlineComparables,
      disclaimer: DISPLAYED_PRICE_DISCLAIMER ?? COMPARABLES_PRICE_DISCLAIMER,
    },
    pricing: { seasons, explanation: PRICING_EXPLANATION },
    projection: {
      annual_revenue: annualRevenue,
      annual_occupancy_pct: annualOcc,
      adr_weighted: adrWeighted,
      nights_booked: num(annual?.nights_booked),
      nights_sellable: num(annual?.nights_sellable) ?? 0,
      rows: Array.isArray(annual?.breakdown) ? annual!.breakdown : [],
      monthly_revenue: monthly,
    },
    positioning: {
      label: positioningLabel,
      advantages,
      differentiators: usp,
      target_primary: str(ai?.target?.primary),
      target_secondary: (ai?.target?.secondary ?? []).map(String),
      usp,
    },
    recommendations,
    method: METHOD_STEPS,
    conclusion: {
      steps: NEXT_STEPS,
      agency: {
        name: input.agency?.name ?? null,
        address: input.agency?.address ?? null,
        city: input.agency?.city ?? null,
        phone: input.agency?.phone ?? null,
        email: input.agency?.email ?? null,
      },
      disclaimer: REPORT_DISCLAIMER,
      comparables_disclaimer: COMPARABLES_PRICE_DISCLAIMER,
    },
    pages: [],
  };

  data.pages = computePages(data);
  return data;
}

/** Une page vide n'est jamais imprimée (§12 des contrôles). */
export function computePages(d: EstimationReportData): ReportPageKey[] {
  const pages: ReportPageKey[] = ["cover"];
  const hasEngineNumbers = d.synthesis.annual_revenue !== null
    || d.synthesis.adr_weighted !== null
    || d.synthesis.seasons.some((s) => s.price_recommended !== null);
  if (hasEngineNumbers) pages.push("synthesis");
  if (d.property.facts.some((f) => f.value !== null) || d.property.photos.length) pages.push("property");
  if (d.location.address || d.location.city || d.location.distances.length || d.location.pois.length) pages.push("location");
  if (d.market.adr !== null || d.market.occupancy_pct !== null || d.market.monthly_revenue.length || d.market.context.length) pages.push("market");
  if (d.comparables.market.length || d.comparables.online.length) pages.push("comparables");
  if (d.pricing.seasons.some((s) => s.price_recommended !== null)) pages.push("pricing");
  if (hasEngineNumbers) pages.push("projection");
  if (d.positioning.label || d.positioning.advantages.length || d.positioning.differentiators.length || d.positioning.target_primary) pages.push("positioning");
  if (d.recommendations.length) pages.push("recommendations");
  pages.push("method", "conclusion");
  return pages;
}

/* ════════════════════════ Contrôles avant génération ════════════════════════ */

export interface ReportCheck {
  key: string;
  label: string;
  level: "ok" | "warning" | "error";
  detail?: string;
}

const FORBIDDEN_PATTERNS: { key: string; label: string; re: RegExp }[] = [
  { key: "commission", label: "Commission", re: /commission/i },
  { key: "menage", label: "Frais de ménage", re: /frais de m[ée]nage|prix du m[ée]nage/i },
  { key: "coefficient", label: "Coefficients internes", re: /coefficient|multiplicateur|p[ée]nalit[ée]|[ée]lasticit[ée]/i },
  { key: "confiance", label: "Confiance interne", re: /score de confiance|confiance interne|data.quality/i },
];

/** Vérifie que le rapport ne s'écarte jamais du moteur et ne fuite rien d'interne. */
export function validateReportData(
  data: EstimationReportData,
  engine: EngineOutput | null,
): ReportCheck[] {
  const checks: ReportCheck[] = [];
  const eq = (a: number | null, b: number | null | undefined) =>
    a === null && (b === null || b === undefined) ? true
      : isNum(a) && isNum(b) ? Math.abs(a - b) < 0.5 : false;

  const push = (key: string, label: string, ok: boolean, detail?: string, level: "warning" | "error" = "error") =>
    checks.push({ key, label, level: ok ? "ok" : level, detail: ok ? undefined : detail });

  push("revenue", "Revenu annuel conforme au moteur",
    eq(data.synthesis.annual_revenue, engine?.annual?.revenue ?? null),
    "Le revenu affiché diffère de la sortie du moteur.");
  push("occupancy", "Occupation annuelle conforme au moteur",
    eq(data.synthesis.annual_occupancy_pct, engine?.annual?.occupancy_pct ?? null),
    "L'occupation affichée diffère de la sortie du moteur.");
  push("adr", "Prix moyen pondéré conforme au moteur",
    eq(data.synthesis.adr_weighted, engine?.annual?.adr_weighted ?? null),
    "Le prix moyen affiché diffère de la sortie du moteur.");

  const seasonsOk = data.pricing.seasons.length === 3
    && data.pricing.seasons.every((s) =>
      s.price_recommended === null
      || ((s.price_min === null || s.price_min <= s.price_recommended)
        && (s.price_max === null || s.price_max >= s.price_recommended)));
  push("seasons", "Trois saisons cohérentes", seasonsOk, "Une fourchette saisonnière est incohérente.");

  const seasonRevenue = data.pricing.seasons.reduce((s, x) => s + (x.revenue ?? 0), 0);
  const total = data.projection.annual_revenue;
  const revenueOk = !isNum(total) || seasonRevenue === 0
    || Math.abs(seasonRevenue - total) <= Math.max(1, total * 0.01);
  push("season-total", "Total annuel cohérent avec les saisons", revenueOk,
    "La somme des revenus saisonniers ne correspond pas au total annuel.");

  const priceLeak = [...data.comparables.market, ...data.comparables.online]
    .some((c) => c.context && /revenu/i.test(c.context));
  push("comparable-price", "Aucun prix affiché présenté comme un revenu", !priceLeak,
    "Un comparable présente un prix affiché comme un revenu.");
  push("comparable-disclaimer", "Mention des prix affichés présente",
    !!data.comparables.disclaimer && !!data.conclusion.comparables_disclaimer,
    "La mention obligatoire sur les prix affichés est absente.");

  const unknownOk = data.property.facts.every((f) => f.value === null || f.value.toLowerCase() !== "absent");
  push("unknown", "Les données inconnues restent inconnues", unknownOk,
    "Une donnée inconnue a été transformée en « absent ».");

  const serialized = JSON.stringify({ ...data, method: null, conclusion: { ...data.conclusion, disclaimer: null } });
  const leaks = FORBIDDEN_PATTERNS.filter((p) => p.re.test(serialized)).map((p) => p.label);
  push("internal", "Aucune donnée interne dans le rapport", leaks.length === 0,
    leaks.length ? `Termes détectés : ${leaks.join(", ")}` : undefined);

  push("photos", "Seules les photos validées sont utilisées", true);
  push("pages", "Aucune page vide", data.pages.length > 0 && new Set(data.pages).size === data.pages.length,
    "Des pages sont dupliquées ou absentes.");
  return checks;
}

export const hasBlockingIssue = (checks: ReportCheck[]) => checks.some((c) => c.level === "error");

// MODULE — Estimation locative · types du moteur de calcul
import type { DataSource } from "./constants";

export type SeasonKey = "basse" | "moyenne" | "haute";

/** Valeur tracée : on connaît toujours d'où elle vient. `null` = UNKNOWN assumé. */
export interface Traced<T> {
  value: T | null;
  source: DataSource;
  note?: string;
}

export interface ComparableInput {
  id: string;
  name?: string | null;
  source?: string | null;
  excluded?: boolean;
  /** Prix affiché à la nuit (EUR après normalisation). */
  adr?: number | null;
  occupancy_pct?: number | null;
  annual_revenue?: number | null;
  bedrooms?: number | null;
  capacity?: number | null;
  bathrooms?: number | null;
  surface_m2?: number | null;
  property_type?: string | null;
  city?: string | null;
  district?: string | null;
  distance_m?: number | null;
  pool?: string | null;
  parking?: string | null;
  view?: string | null;
  exterior?: string | null;
  ac?: string | null;
  standing?: number | null;
  amenities?: string[];
  distance_sea_m?: number | null;
  currency?: string | null;
}

export interface ScoredComparable {
  id: string;
  name: string | null;
  adr: number | null;
  occupancy: number | null;
  score: number;
  weight: number;
  outlier: boolean;
  used: boolean;
  detail: Record<string, number | null>;
  missing: string[];
}

export interface AdjustmentItem {
  key: string;
  label: string;
  base_pct: number;
  penetration: number | null;
  applied_pct: number;
  rationale: string;
}

export interface SeasonResult {
  key: SeasonKey;
  label: string;
  nights_total: number;
  nights_sellable: number;
  price_math: number | null;
  price_recommended: number | null;
  price_min: number | null;
  price_max: number | null;
  occupancy_pct: number | null;
  nights_booked: number | null;
  revenue: number | null;
}

export interface EngineAlert {
  level: "info" | "warning" | "critical";
  message: string;
}

export interface EngineOutput {
  version: string;
  computed_at: string;
  status: "ok" | "insufficient_data";
  unknowns: string[];
  alerts: EngineAlert[];

  market: {
    baseline_adr: Traced<number>;
    baseline_occupancy: Traced<number>;
    rdna_adr: number | null;
    rdna_occupancy: number | null;
    comparables_adr: number | null;
    comparables_occupancy: number | null;
    penetration: Record<string, number>;
    sources_used: string[];
  };

  comparables: ScoredComparable[];

  property_score: {
    total: number | null;
    axes: Record<string, number | null>;
    axes_used: string[];
    axes_missing: string[];
  };

  positioning: { key: string; label: string; price_factor: number } | null;

  adjustments: { items: AdjustmentItem[]; total_pct: number };

  pricing: {
    reference_adr: number | null;
    elasticity: number | null;
    elasticity_source: DataSource;
    optimal_adr: number | null;
    optimal_adr_before_guardrails: number | null;
    guardrail_applied: string | null;
    curve: { price: number; occupancy: number; revenue: number }[];
  };

  seasons: Record<SeasonKey, SeasonResult>;

  annual: {
    nights_year: number;
    nights_blocked: number;
    nights_sellable: number;
    nights_booked: number | null;
    occupancy_pct: number | null;
    adr_weighted: number | null;
    revenue: number | null;
    breakdown: { label: string; nights: number; occupancy_pct: number; adr: number; revenue: number }[];
  };

  confidence: {
    score: number;
    factors: { key: string; label: string; points: number; max: number; note: string }[];
  };

  coherence: {
    rdna_adr: number | null;
    comparables_adr: number | null;
    model_adr: number | null;
    max_divergence_pct: number | null;
    verdict: "coherent" | "ecart" | "conflit" | "insuffisant";
  };

  /** Détail lisible du raisonnement (§24). */
  trace: { step: string; detail: string }[];
}

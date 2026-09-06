// MODULE — Estimation locative · CONFIGURATION CENTRALE DU MOTEUR
// ─────────────────────────────────────────────────────────────────────────────
// RÈGLE ABSOLUE : tout coefficient, seuil ou règle métier du moteur vit ICI.
// Aucun composant UI, aucun hook, aucune edge function ne doit contenir de
// coefficient de pricing en dur. Modifier le moteur = modifier ce fichier
// (ou surcharger via `engine_params` sur l'estimation, cf. mergeConfig).
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINE_VERSION = "2.0.0";

/** Taux de conversion utilisé quand une source RDNA est libellée en USD.
 *  Volontairement explicite et modifiable : jamais de conversion silencieuse. */
export interface CurrencyConfig {
  usd_to_eur: number;
  /** Devise du rapport final. */
  report_currency: "EUR";
}

export interface SimilarityWeights {
  distance: number;
  commune: number;
  quartier: number;
  chambres: number;
  capacite: number;
  sdb: number;
  type: number;
  surface: number;
  piscine: number;
  parking: number;
  vue: number;
  exterieur: number;
  climatisation: number;
  standing: number;
  equipements: number;
  proximite_mer: number;
}

export interface EngineConfig {
  version: string;
  currency: CurrencyConfig;

  /** §5 — pondérations du score de similarité des comparables. */
  similarity: {
    weights: SimilarityWeights;
    /** Distance (m) au-delà de laquelle la similarité géographique tombe à 0. */
    distance_zero_m: number;
    /** Similarité géographique = 1 en deçà de cette distance. */
    distance_full_m: number;
    /** Un comparable en dessous de ce score n'entre pas dans le baseline. */
    min_score_to_use: number;
    /** Nombre maximum de comparables retenus (les mieux notés). */
    max_used: number;
    /** Exposant appliqué au score pour obtenir le poids : accentue les proches. */
    weight_exponent: number;
  };

  /** §6 — construction du Market Baseline. */
  baseline: {
    /** Détection d'outliers par écart médian absolu (MAD). */
    outlier_mad_factor: number;
    /** Nombre minimum de comparables pour activer la détection d'outliers. */
    outlier_min_sample: number;
    /** Poids relatif des sources dans le baseline (renormalisés sur les sources présentes). */
    source_weights: {
      rdna_market: number;
      comparables: number;
    };
    /** Nombre minimum de comparables exploitables pour ne pas dégrader la confiance. */
    min_comparables_reliable: number;
  };

  /** §7 — Property Score sur 100. */
  property_score: {
    axis_weights: Record<
      "standing" | "etat" | "design" | "equipements" | "localisation" | "exterieurs" | "vue" | "qualite_percue",
      number
    >;
    /** Score neutre appliqué UNIQUEMENT pour renormaliser un axe manquant :
     *  un axe inconnu est exclu du calcul, jamais compté comme positif. */
    neutral_score: number;
  };

  /** §8 — bornes de positionnement (score du bien /100). */
  positioning: {
    tiers: { key: string; label: string; min_score: number; price_factor: number }[];
  };

  /** §9 & §10 — ajustements relatifs au marché. */
  adjustments: {
    /** Amplitude maximale (en %) de l'ensemble des ajustements cumulés. */
    max_total_pct: number;
    /** Amplitude maximale d'un ajustement isolé. */
    max_single_pct: number;
    /** Prime maximale d'un atout totalement différenciant (pénétration marché ~0 %). */
    rarity_full_bonus_pct: number;
    /** Pénalité maximale pour l'absence d'un équipement quasi universel. */
    missing_standard_max_penalty_pct: number;
    /** Pénétration marché par défaut quand la donnée RDNA est absente
     *  → l'ajustement est fortement atténué (aucune donnée ≠ donnée favorable). */
    unknown_penetration_damping: number;
    /** Impacts bruts par caractéristique, modulés ensuite par la rareté locale. */
    features: {
      vue_mer_panoramique: number;
      vue_mer_partielle: number;
      vue_degagee: number;
      plage_moins_300m: number;
      plage_moins_800m: number;
      centre_moins_600m: number;
      piscine_privee: number;
      piscine_commune: number;
      jardin: number;
      terrasse: number;
      balcon: number;
      parking_prive: number;
      garage: number;
      climatisation_totale: number;
      climatisation_partielle: number;
      absence_climatisation: number;
      absence_parking: number;
      absence_wifi: number;
    };
  };

  /** §11 — saisonnalité. */
  seasonality: {
    /** Répartition par défaut des nuits (utilisée quand aucune donnée mensuelle RDNA). */
    default_nights: { basse: number; moyenne: number; haute: number };
    /** Multiplicateurs de prix par saison appliqués à l'ADR de référence. */
    default_price_index: { basse: number; moyenne: number; haute: number };
    /** Occupation de référence par saison (utilisée si aucune donnée marché). */
    default_occupancy: { basse: number; moyenne: number; haute: number };
    /** Seuils (part du revenu mensuel dans l'année) pour classer un mois via RDNA. */
    month_high_share: number;
    month_mid_share: number;
  };

  /** §13 — élasticité prix / occupation. */
  elasticity: {
    /** Élasticité par défaut (variation d'occupation pour +1 % de prix). */
    default: number;
    /** Courbure : l'occupation chute d'autant plus vite que le prix s'éloigne du prix juste.
     *  Sans courbure, le revenu croîtrait indéfiniment avec le prix (élasticité > -1). */
    curvature: number;
    /** Dispersion minimale des prix des comparables pour déduire une élasticité fiable. */
    min_price_dispersion: number;
    /** Bornes de l'élasticité déduite des comparables. */
    min: number;
    max: number;
    /** Occupation plafond, quel que soit le prix. */
    occupancy_cap: number;
    /** Occupation plancher. */
    occupancy_floor: number;
  };

  /** §14 — optimisation du revenu. */
  optimization: {
    /** Plage de recherche autour du prix de référence. */
    search_min_factor: number;
    search_max_factor: number;
    /** Pas de recherche (en fraction du prix de référence). */
    search_step: number;
    /** Occupation minimale acceptable : un optimum sous ce seuil est rejeté. */
    min_acceptable_occupancy: number;
    /** Gain de revenu minimum (%) exigé pour s'écarter du prix de marché. */
    min_revenue_gain_pct: number;
  };

  /** §15 — garde-fous. */
  guardrails: {
    /** Écart maximal autorisé vs marché, vers le haut / vers le bas. */
    max_above_market_pct: number;
    max_below_market_pct: number;
    /** En dessous de ce nombre de comparables, on resserre encore l'écart. */
    thin_data_comparables: number;
    thin_data_max_deviation_pct: number;
  };

  /** §23 — largeur des fourchettes. */
  ranges: {
    low_pct: number;
    high_pct: number;
    /** Fourchette élargie quand la confiance est faible. */
    low_confidence_extra_pct: number;
    low_confidence_threshold: number;
  };

  /** §16 — arrondis psychologiques. */
  psychological: {
    enabled: boolean;
    /** Terminaisons recherchées, par ordre de préférence. */
    endings: number[];
    /** Écart maximal toléré (%) entre prix mathématique et prix commercial. */
    max_drift_pct: number;
  };

  /** §18 — durée minimale de séjour. */
  min_stay: {
    /** Impact sur l'occupation selon la durée minimale exigée. */
    occupancy_factor: Record<string, number>;
  };

  /** §17 — frais de ménage (INTERNE). */
  cleaning: {
    /** Durée de séjour moyenne retenue pour lisser le ménage sur le coût total. */
    assumed_stay_nights: number;
    /** Impact maximum (%) sur l'occupation d'un coût total non compétitif. */
    max_occupancy_impact_pct: number;
  };

  /** §25 — confiance interne. */
  confidence: {
    weights: {
      rdna: number;
      comparables: number;
      comparables_quality: number;
      photos: number;
      ai: number;
      location: number;
      coherence: number;
      completeness: number;
    };
    /** Nombre de comparables donnant le score maximum. */
    comparables_target: number;
    photos_target: number;
    /** §26 — écart entre sources au-delà duquel une alerte est levée. */
    source_divergence_alert_pct: number;
    source_divergence_critical_pct: number;
  };
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  version: ENGINE_VERSION,
  currency: { usd_to_eur: 0.92, report_currency: "EUR" },

  similarity: {
    weights: {
      distance: 18,
      commune: 10,
      quartier: 5,
      chambres: 14,
      capacite: 10,
      sdb: 5,
      type: 8,
      surface: 6,
      piscine: 10,
      parking: 4,
      vue: 9,
      exterieur: 4,
      climatisation: 3,
      standing: 6,
      equipements: 4,
      proximite_mer: 6,
    },
    distance_zero_m: 12000,
    distance_full_m: 600,
    min_score_to_use: 35,
    max_used: 12,
    weight_exponent: 2,
  },

  baseline: {
    outlier_mad_factor: 3,
    outlier_min_sample: 5,
    source_weights: { rdna_market: 0.55, comparables: 0.45 },
    min_comparables_reliable: 4,
  },

  property_score: {
    axis_weights: {
      standing: 16,
      etat: 14,
      design: 12,
      equipements: 12,
      localisation: 18,
      exterieurs: 10,
      vue: 10,
      qualite_percue: 8,
    },
    neutral_score: 50,
  },

  positioning: {
    tiers: [
      { key: "entree", label: "Entrée de marché", min_score: 0, price_factor: 0.84 },
      { key: "standard", label: "Standard", min_score: 45, price_factor: 0.95 },
      { key: "superieur", label: "Supérieur", min_score: 60, price_factor: 1.06 },
      { key: "premium", label: "Premium", min_score: 74, price_factor: 1.18 },
      { key: "tres_premium", label: "Très premium", min_score: 86, price_factor: 1.32 },
    ],
  },

  adjustments: {
    max_total_pct: 35,
    max_single_pct: 14,
    rarity_full_bonus_pct: 1.4,
    missing_standard_max_penalty_pct: 10,
    unknown_penetration_damping: 0.4,
    features: {
      vue_mer_panoramique: 12,
      vue_mer_partielle: 6,
      vue_degagee: 2.5,
      plage_moins_300m: 8,
      plage_moins_800m: 4,
      centre_moins_600m: 3,
      piscine_privee: 11,
      piscine_commune: 4,
      jardin: 4,
      terrasse: 3,
      balcon: 1.5,
      parking_prive: 3.5,
      garage: 4.5,
      climatisation_totale: 3.5,
      climatisation_partielle: 1.5,
      absence_climatisation: -6,
      absence_parking: -4,
      absence_wifi: -8,
    },
  },

  seasonality: {
    default_nights: { basse: 181, moyenne: 92, haute: 92 },
    default_price_index: { basse: 0.72, moyenne: 0.95, haute: 1.55 },
    default_occupancy: { basse: 0.34, moyenne: 0.55, haute: 0.85 },
    month_high_share: 0.115,
    month_mid_share: 0.075,
  },

  elasticity: {
    default: -0.9,
    curvature: 1.6,
    min_price_dispersion: 0.08,
    min: -2.2,
    max: -0.35,
    occupancy_cap: 0.93,
    occupancy_floor: 0.05,
  },

  optimization: {
    search_min_factor: 0.7,
    search_max_factor: 1.35,
    search_step: 0.01,
    min_acceptable_occupancy: 0.25,
    min_revenue_gain_pct: 1.5,
  },

  guardrails: {
    max_above_market_pct: 45,
    max_below_market_pct: 30,
    thin_data_comparables: 3,
    thin_data_max_deviation_pct: 20,
  },

  ranges: {
    low_pct: 8,
    high_pct: 10,
    low_confidence_extra_pct: 6,
    low_confidence_threshold: 55,
  },

  psychological: {
    enabled: true,
    endings: [9, 5, 0, 7],
    max_drift_pct: 3,
  },

  min_stay: {
    occupancy_factor: {
      Flexible: 1,
      "2 nuits": 1,
      "3 nuits": 0.97,
      "4 nuits": 0.94,
      "5 nuits": 0.9,
      "7 nuits": 0.85,
    },
  },

  cleaning: {
    assumed_stay_nights: 5,
    max_occupancy_impact_pct: 6,
  },

  confidence: {
    weights: {
      rdna: 18,
      comparables: 14,
      comparables_quality: 12,
      photos: 10,
      ai: 12,
      location: 10,
      coherence: 14,
      completeness: 10,
    },
    comparables_target: 6,
    photos_target: 12,
    source_divergence_alert_pct: 15,
    source_divergence_critical_pct: 30,
  },
};

/** Fusion profonde d'une surcharge partielle (stockée sur l'estimation) avec la config par défaut. */
export function mergeConfig(overrides?: unknown): EngineConfig {
  return deepMerge(DEFAULT_ENGINE_CONFIG, overrides) as EngineConfig;
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base;
  if (typeof base !== "object" || base === null || Array.isArray(base)) return patch as T;
  if (typeof patch !== "object" || Array.isArray(patch)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    out[k] = k in out ? deepMerge((base as Record<string, unknown>)[k], v) : v;
  }
  return out as T;
}

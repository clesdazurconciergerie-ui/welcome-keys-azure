// MODULE — Estimation locative · modèles de données (étape 1 : architecture)

import type { DataSource } from "./constants";

export interface EstimOwner {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

/** Localisation enrichie automatiquement (WEB) — jamais saisie à la main si évitable. */
export interface LocationData {
  distance_mer_m?: number | null;
  distance_plage_m?: number | null;
  distance_centre_m?: number | null;
  distance_gare_m?: number | null;
  restaurants?: string[];
  commerces?: string[];
  supermarches?: string[];
  points_interet?: string[];
  transports?: string[];
  environnement?: string | null;
  axes_routiers?: string[];
  fetched_at?: string | null;
}

export interface PropertyFeatures {
  surface_interieure_m2?: number | null;
  surface_exterieure_m2?: number | null;
  chambres?: number | null;
  couchages?: number | null;
  salles_de_bain?: number | null;
  wc?: number | null;
  etage_mode?: string;        // rdc | numeric | last | unknown
  etage_numero?: number | null;
  ascenseur?: boolean | null;
  acces_pmr?: boolean | null;
  exterieurs?: string[];
  vue?: string;
  piscine?: string;
  parking?: string;
  climatisation?: string;
  wifi?: string;
  equipements?: string[];
}

export interface RentalConstraints {
  duree_minimale?: string;
  strategie_proprietaire?: string;
  nuits_bloquees?: number | null;
  periodes_bloquees?: { debut: string; fin: string; label?: string }[];
  animaux?: string;
  prix_menage_eur?: number | null; // INTERNE — jamais dans le rapport propriétaire
}

/** Analyse IA des photos — structurée, jamais inventée. */
export interface AiPhotoAnalysis {
  qualite_generale?: number | null;
  etat?: number | null;
  standing?: number | null;
  mobilier?: number | null;
  decoration?: number | null;
  style?: string | null;
  modernite?: number | null;
  cuisine?: number | null;
  salles_de_bain?: number | null;
  literie?: number | null;
  luminosite?: number | null;
  exterieurs?: number | null;
  vue?: number | null;
  equipements_percus?: string[];
  potentiel_esthetique?: number | null;
  potentiel_instagram?: number | null;
  points_forts?: string[];
  points_faibles?: string[];
  elements_vieillissants?: string[];
  facteurs_baissiers?: string[];
  facteurs_haussiers?: string[];
  caracteristiques_detectees?: { cle: string; valeur: string }[];
}

export type AiScores = Partial<Record<
  "standing" | "etat" | "design" | "equipements" | "localisation" | "exterieurs" | "vue" | "qualite_percue",
  number | null
>> & { total?: number | null };

/** Données RDNA / AirDNA extraites d'un PDF (structure générique). */
export interface RdnaData {
  market_score?: number | null;
  chambres?: number | null;
  sdb?: number | null;
  voyageurs?: number | null;
  adr_eur?: number | null;
  occupation_pct?: number | null;
  revenu_annuel_eur?: number | null;
  confiance?: string | null;
  monthly_revenue?: { month: string; revenue_eur: number }[];
  extra?: Record<string, unknown>;
}

export interface SeasonBlock {
  label?: string;
  periodes?: { debut: string; fin: string }[];
  prix_min?: number | null;
  prix_max?: number | null;
  prix_recommande?: number | null;
  occupation_pct?: number | null;
}

export interface EstimationResults {
  basse?: SeasonBlock;
  moyenne?: SeasonBlock;
  haute?: SeasonBlock;
  annuel?: {
    nuits_commercialisables?: number | null;
    occupation_pct?: number | null;
    adr_moyen?: number | null;
    ca_annuel?: number | null;
  };
  engine_version?: string | null;
}

/** Origine de chaque donnée clé (§15 du cahier des charges). */
export type SourcesMap = Record<string, DataSource>;

export interface Estimation {
  id: string;
  user_id: string;
  owner_id: string | null;
  reference: string;
  status: string;
  title: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string | null;
  location_data: LocationData;
  features: PropertyFeatures;
  constraints: RentalConstraints;
  ai_analysis: AiPhotoAnalysis;
  ai_scores: AiScores;
  rdna_data: RdnaData;
  market_data: Record<string, unknown>;
  seasonality: Record<string, unknown>;
  results: EstimationResults;
  sources: SourcesMap;
  manual_overrides: Record<string, unknown>;
  confidence_score: number | null;
  internal_notes: string | null;
  report_url: string | null;
  created_at: string;
  updated_at: string;
  owner?: EstimOwner | null;
}

export interface EstimPhoto {
  id: string;
  estimation_id: string;
  storage_path: string;
  file_name: string | null;
  category: string | null;
  position: number;
  is_cover: boolean;
  ai_analysis: AiPhotoAnalysis;
  quality_score: number | null;
}

export interface EstimDocument {
  id: string;
  estimation_id: string;
  kind: string;
  storage_path: string;
  file_name: string | null;
  status: string;
  extracted: Record<string, unknown>;
  error_message: string | null;
}

export interface EstimComparable {
  id: string;
  estimation_id: string;
  source: string;
  name: string | null;
  url: string | null;
  bedrooms: number | null;
  capacity: number | null;
  displayed_price: number | null;
  occupancy_pct: number | null;
  annual_revenue: number | null;
  similarity_score: number | null;
  is_primary: boolean;
}

/** Confiance interne (visible uniquement en interne). */
export function computeConfidence(input: {
  hasRdna: boolean;
  comparables: number;
  photos: number;
  hasAi: boolean;
  hasCoords: boolean;
  userFieldsFilled: number;
}): number {
  let s = 0;
  if (input.hasRdna) s += 25;
  s += Math.min(input.comparables, 6) * 3;      // max 18
  s += Math.min(input.photos, 15);              // max 15
  if (input.hasAi) s += 15;
  if (input.hasCoords) s += 12;
  s += Math.min(input.userFieldsFilled, 15);    // max 15
  return Math.max(0, Math.min(100, Math.round(s)));
}

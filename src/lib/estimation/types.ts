import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Types partagés — utilisés par le wizard, le moteur et le rapport.
// Ne PAS y ajouter de valeur calculée : ces types décrivent uniquement
// les entrées propriétaire (source unique de vérité pour le moteur §3).
// ─────────────────────────────────────────────────────────────

export type PropertyType = "bien_entier" | "partie_villa";
export type PoolType = "aucune" | "collective" | "privee";
export type ViewQuality = "aucune" | "degagee" | "mer_partielle" | "mer_totale" | "exceptionnelle";
export type ExteriorType = "aucun" | "balcon" | "terrasse" | "jardin";
export type CuisineLevel = "basique" | "standard" | "premium" | "haut_de_gamme";
export type StandingLevel = "basique" | "standard" | "premium" | "luxe";
export type PhotoQuality = "amateur" | "correcte" | "professionnelle" | "editoriale";

export interface ContactStep {
  nom: string;
  email: string;
  telephone: string;
}
export interface LocalisationStep {
  adresse: string;
  ville: string;
  code_postal: string;
  quartier: string;
  distance_plage_m: number | null;
  distance_commerces_m: number | null;
  lat: number | null;
  lng: number | null;
}
export interface BienStep {
  type: PropertyType;
  surface_m2: number;
  voyageurs: number;
  chambres: number;
  sdb: number;
  etage: number | null;
  ascenseur: boolean;
}
export interface ExterieurStep {
  type: ExteriorType;
  surface_m2: number | null;
  vue: ViewQuality;
  piscine: PoolType;
  parking: boolean;
}
export interface EquipementStep {
  clim: boolean;
  wifi: boolean;
  cuisine: CuisineLevel;
  standing: StandingLevel;
  annee_renovation: number | null;
  qualite_photos: PhotoQuality;
}
export interface StrategieStep {
  clientele_cible: string;
  atouts: string;
  faiblesses: string;
  revenus_actuels_eur: number | null;
}

// Comparable AirDNA saisi manuellement ou extrait d'un PDF.
export interface AirdnaComparable {
  nom: string;
  adr_eur: number;
  occupation_pct: number;
  revenu_annuel_eur: number;
}
export interface AirdnaData {
  adr_eur: number | null;
  occupation_pct: number | null;
  revenu_annuel_eur: number | null;
  prix_haute_eur: number | null;
  prix_moyenne_eur: number | null;
  prix_basse_eur: number | null;
  comparables: AirdnaComparable[];
}
export interface MarcheIaData {
  enabled: boolean; // true seulement si l'analyse IA a été lancée et a répondu
  // La forme exacte de la réponse est fixée par l'edge function `estimation-market-research`.
  raw?: unknown;
}
export interface DonneesMarcheStep {
  airdna: AirdnaData | null;
  marche_ia: MarcheIaData | null;
}

export interface PhotoItem {
  id: string;
  data_url: string; // base64 — servent uniquement au rapport, JAMAIS stockées dans l'historique localStorage.
  name: string;
  couverture: boolean;
}
export interface PhotosStep {
  items: PhotoItem[];
}

export interface EstimationFormData {
  contact: ContactStep;
  localisation: LocalisationStep;
  bien: BienStep;
  exterieur: ExterieurStep;
  equipement: EquipementStep;
  strategie: StrategieStep;
  donnees_marche: DonneesMarcheStep;
  photos: PhotosStep;
}

// ─────────────────────────────────────────────────────────────
// Schémas de validation zod — un par étape, pour un feedback ciblé.
// ─────────────────────────────────────────────────────────────

const nonEmpty = (max: number, label: string) =>
  z.string().trim().min(1, `${label} requis`).max(max, `${label} trop long`);

export const contactSchema = z.object({
  nom: nonEmpty(120, "Nom"),
  email: z.string().trim().email("Email invalide").max(255),
  telephone: nonEmpty(30, "Téléphone"),
});

export const localisationSchema = z.object({
  adresse: nonEmpty(200, "Adresse"),
  ville: nonEmpty(80, "Ville"),
  code_postal: z.string().trim().regex(/^\d{5}$/, "Code postal à 5 chiffres"),
  quartier: z.string().trim().max(80),
  distance_plage_m: z.number().int().min(0).max(50000).nullable(),
  distance_commerces_m: z.number().int().min(0).max(50000).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

export const bienSchema = z.object({
  type: z.enum(["bien_entier", "partie_villa"]),
  surface_m2: z.number().int().min(10).max(2000),
  voyageurs: z.number().int().min(1).max(30),
  chambres: z.number().int().min(0).max(20),
  sdb: z.number().int().min(0).max(20),
  etage: z.number().int().min(-2).max(50).nullable(),
  ascenseur: z.boolean(),
});

export const exterieurSchema = z.object({
  type: z.enum(["aucun", "balcon", "terrasse", "jardin"]),
  surface_m2: z.number().int().min(0).max(10000).nullable(),
  vue: z.enum(["aucune", "degagee", "mer_partielle", "mer_totale", "exceptionnelle"]),
  piscine: z.enum(["aucune", "collective", "privee"]),
  parking: z.boolean(),
});

export const equipementSchema = z.object({
  clim: z.boolean(),
  wifi: z.boolean(),
  cuisine: z.enum(["basique", "standard", "premium", "haut_de_gamme"]),
  standing: z.enum(["basique", "standard", "premium", "luxe"]),
  annee_renovation: z.number().int().min(1900).max(new Date().getFullYear() + 1).nullable(),
  qualite_photos: z.enum(["amateur", "correcte", "professionnelle", "editoriale"]),
});

export const strategieSchema = z.object({
  clientele_cible: z.string().trim().max(500),
  atouts: z.string().trim().max(1000),
  faiblesses: z.string().trim().max(1000),
  revenus_actuels_eur: z.number().min(0).max(10_000_000).nullable(),
});

export const photosSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      data_url: z.string().startsWith("data:image/"),
      name: z.string().max(200),
      couverture: z.boolean(),
    }),
  ).max(30, "Maximum 30 photos"),
});

// ─────────────────────────────────────────────────────────────
// Valeurs par défaut (formulaire vierge).
// ─────────────────────────────────────────────────────────────
export const emptyEstimationForm = (): EstimationFormData => ({
  contact: { nom: "", email: "", telephone: "" },
  localisation: {
    adresse: "", ville: "Saint-Raphaël", code_postal: "83700", quartier: "",
    distance_plage_m: null, distance_commerces_m: null, lat: null, lng: null,
  },
  bien: {
    type: "bien_entier", surface_m2: 50, voyageurs: 4, chambres: 1, sdb: 1,
    etage: null, ascenseur: false,
  },
  exterieur: {
    type: "aucun", surface_m2: null, vue: "aucune", piscine: "aucune", parking: false,
  },
  equipement: {
    clim: false, wifi: true, cuisine: "standard", standing: "standard",
    annee_renovation: null, qualite_photos: "correcte",
  },
  strategie: {
    clientele_cible: "", atouts: "", faiblesses: "", revenus_actuels_eur: null,
  },
  donnees_marche: { airdna: null, marche_ia: null },
  photos: { items: [] },
});

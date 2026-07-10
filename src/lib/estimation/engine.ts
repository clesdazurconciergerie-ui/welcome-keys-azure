/**
 * Moteur d'estimation locative Azurkeys — implémentation déterministe.
 *
 * SOURCE DES CONSTANTES (barème § "SYSTÈME DE POINTS") :
 *   Base 45 pts, ajustements listés, borné 10-100 → sélection percentile
 *   P50/P70/P85 · multiplicateurs plafonnés à ×1.60 · P85 × 1.30 max ·
 *   planchers par catégorie · Partie de villa ×0.65 APRÈS plafonds ·
 *   fusion AirDNA 60/40 prix, 50/50 revenus · scénario optimisé
 *   plafonné à +35 %.
 *
 * MÊMES ENTRÉES → MÊMES SORTIES. Aucun aléa. Cette fonction est le
 * miroir front du moteur back (edge function `estimation-calculate`).
 */

import type { AirdnaData, EstimationFormData } from "./types";

// ─────────────────────────────────────────────────────────────
// 1. Catégorisation
// ─────────────────────────────────────────────────────────────
export type Category =
  | "studio" | "appt_standard" | "appt_premium"
  | "maison" | "villa" | "villa_luxe";

const CATEGORY_LABEL: Record<Category, string> = {
  studio:        "Studio",
  appt_standard: "Appartement standard",
  appt_premium:  "Appartement premium",
  maison:        "Maison",
  villa:         "Villa",
  villa_luxe:    "Villa de luxe",
};

export function categorize(form: EstimationFormData): Category {
  const { bien, exterieur, equipement } = form;
  const surface = bien.surface_m2;
  const chambres = bien.chambres;
  const piscinePrivee = exterieur.piscine === "privee";
  const vueMerHaute = exterieur.vue === "mer_totale" || exterieur.vue === "exceptionnelle";
  const standing = equipement.standing;

  if (chambres <= 0 || (chambres === 1 && surface <= 30)) return "studio";
  if (standing === "luxe" && piscinePrivee && (vueMerHaute || surface >= 200)) return "villa_luxe";
  if (piscinePrivee && surface >= 100) return "villa";
  if ((piscinePrivee || surface >= 120) && standing !== "basique") return "maison";
  if (standing === "premium" || standing === "luxe" || (surface >= 80 && (vueMerHaute || exterieur.vue === "mer_partielle"))) return "appt_premium";
  return "appt_standard";
}

// ─────────────────────────────────────────────────────────────
// 2. Score d'optimisation 10-100 (base 45)
// ─────────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  base: number;
  standing: number;
  photos: number;
  piscine: number;
  vue: number;
  plage: number;
  equipements: number; // clim + wifi + parking + extérieur + cuisine
  renovation: number;
  capacite: number;
  total: number; // borné 10-100
  normalized: number; // (total-10)/90 ∈ [0,1]
}

function pts(cond: boolean, v: number) { return cond ? v : 0; }

export function scoreProperty(form: EstimationFormData): ScoreBreakdown {
  const { bien, exterieur, equipement, localisation } = form;

  // Standing : luxe/premium/standard/basique dans nos types (pas de "haut_de_gamme"
  // ni "daté" en enum). On mappe Luxe=+18, Premium=+12, Standard=0, Basique=−18.
  const standing =
    equipement.standing === "luxe" ? 18 :
    equipement.standing === "premium" ? 12 :
    equipement.standing === "standard" ? 0 : -18;

  // Photos : editoriale/professionnelle=Pro (+10), correcte=Semi-pro (+4), amateur=-5.
  const photos =
    equipement.qualite_photos === "editoriale" || equipement.qualite_photos === "professionnelle" ? 10 :
    equipement.qualite_photos === "correcte" ? 4 : -5;

  const piscine =
    exterieur.piscine === "privee" ? 11 :
    exterieur.piscine === "collective" ? 4 : 0;

  // Vue : exceptionnelle & mer_totale → Mer panoramique (+13), mer_partielle → Mer (+9),
  // degagee → Montagne/dégagée (+4), aucune (0). Jardin non exposé dans notre form.
  const vue =
    exterieur.vue === "exceptionnelle" || exterieur.vue === "mer_totale" ? 13 :
    exterieur.vue === "mer_partielle" ? 9 :
    exterieur.vue === "degagee" ? 4 : 0;

  const d = localisation.distance_plage_m;
  const plage =
    d == null ? 0 :
    d <= 100 ? 10 :
    d <= 200 ? 8 :
    d <= 500 ? 5 :
    d <= 1000 ? 2 : 0;

  const equipements =
    pts(equipement.clim, 3) +
    pts(equipement.wifi, 2) +
    pts(exterieur.parking, 3) +
    pts(exterieur.type !== "aucun", 3) +
    pts(equipement.cuisine === "haut_de_gamme", 3);

  const now = new Date().getFullYear();
  const age = equipement.annee_renovation == null ? Infinity : now - equipement.annee_renovation;
  const renovation = age <= 2 ? 6 : age <= 5 ? 4 : age <= 10 ? 2 : 0;

  const capacite = bien.voyageurs >= 8 ? 3 : bien.voyageurs >= 6 ? 1 : 0;

  const raw = 45 + standing + photos + piscine + vue + plage + equipements + renovation + capacite;
  const total = Math.max(10, Math.min(100, raw));
  return {
    base: 45,
    standing, photos, piscine, vue, plage, equipements, renovation, capacite,
    total,
    normalized: (total - 10) / 90,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. Barème prix P50/P70/P85 (€/nuit haute saison)
// ─────────────────────────────────────────────────────────────
const BASE_PRICE_HAUTE: Record<Category, { p50: number; p70: number; p85: number }> = {
  studio:        { p50:   85, p70:  115, p85:  155 },
  appt_standard: { p50:  130, p70:  190, p85:  280 },
  appt_premium:  { p50:  190, p70:  300, p85:  440 },
  maison:        { p50:  260, p70:  420, p85:  640 },
  villa:         { p50:  520, p70:  820, p85: 1250 },
  villa_luxe:    { p50: 1200, p70: 2000, p85: 3800 },
};

const PLANCHER_HAUTE: Record<Category, number> = {
  studio: 70, appt_standard: 110, appt_premium: 180,
  maison: 240, villa: 500, villa_luxe: 1100,
};

// Coefficients saison moyenne / basse (par catégorie).
const RATIO_MOYENNE: Record<Category, number> = {
  studio: 0.58, appt_standard: 0.58, appt_premium: 0.58,
  maison: 0.55, villa: 0.50, villa_luxe: 0.45,
};
const RATIO_BASSE: Record<Category, number> = {
  studio: 0.40, appt_standard: 0.40, appt_premium: 0.38,
  maison: 0.35, villa: 0.30, villa_luxe: 0.27,
};

// Nuitées potentielles imposées par le prompt.
const NUITEES_POTENTIELLES = { basse: 150, moyenne: 120, haute: 90 } as const;

// Occupations par saison (référence marché Côte d'Azur) — pondérées par le score.
// Base médiane, modulée par score normalisé : occ = base + (norm − 0.5) × plage.
const OCC_BASE = { basse: 0.28, moyenne: 0.55, haute: 0.80 } as const;
const OCC_PLAGE = { basse: 0.10, moyenne: 0.15, haute: 0.10 } as const;

// ─────────────────────────────────────────────────────────────
// 4. Multiplicateurs de prix
// ─────────────────────────────────────────────────────────────
function multipliers(form: EstimationFormData) {
  const { bien, exterieur, equipement, localisation } = form;
  const parts: { label: string; value: number }[] = [];

  if (bien.chambres >= 4) parts.push({ label: `Chambres ×${bien.chambres}`, value: 1 + 0.07 * (bien.chambres - 3) });
  if (bien.surface_m2 > 200) parts.push({ label: "Surface >200 m²", value: 1.10 });
  else if (bien.surface_m2 > 150) parts.push({ label: "Surface >150 m²", value: 1.05 });
  if (bien.voyageurs > 2.5 * bien.chambres) parts.push({ label: "Densité voyageurs élevée", value: 1.03 });

  const s = equipement.standing;
  if (s === "luxe") parts.push({ label: "Standing Luxe", value: 1.45 });
  else if (s === "premium") parts.push({ label: "Standing Premium", value: 1.28 });
  else if (s === "basique") parts.push({ label: "Standing Basique", value: 0.80 });

  const v = exterieur.vue;
  if (v === "exceptionnelle" || v === "mer_totale") parts.push({ label: "Vue mer panoramique", value: 1.38 });
  else if (v === "mer_partielle") parts.push({ label: "Vue mer", value: 1.20 });
  else if (v === "degagee") parts.push({ label: "Vue dégagée", value: 1.06 });

  if (exterieur.piscine === "privee") parts.push({ label: "Piscine privée", value: 1.25 });
  else if (exterieur.piscine === "collective") parts.push({ label: "Piscine collective", value: 1.08 });

  const ville = localisation.ville.toLowerCase();
  if (/(cannes|saint[- ]?tropez|monaco)/.test(ville)) parts.push({ label: `Ville ${localisation.ville}`, value: 1.18 });
  else if (/(nice|antibes|villefranche)/.test(ville)) parts.push({ label: `Ville ${localisation.ville}`, value: 1.10 });
  else if (/(menton|juan|cap[- ])/.test(ville)) parts.push({ label: `Ville ${localisation.ville}`, value: 1.06 });

  const d = localisation.distance_plage_m;
  if (d != null) {
    if (d <= 100) parts.push({ label: "Plage ≤100 m", value: 1.40 });
    else if (d <= 200) parts.push({ label: "Plage ≤200 m", value: 1.22 });
    else if (d <= 500) parts.push({ label: "Plage ≤500 m", value: 1.08 });
    else if (d <= 1000) parts.push({ label: "Plage ≤1000 m", value: 1.03 });
  }

  // Combo premium
  const critsPremium = [
    s === "luxe",
    v === "exceptionnelle" || v === "mer_totale" || v === "mer_partielle",
    exterieur.piscine === "privee",
    d != null && d <= 200,
  ].filter(Boolean).length;
  if (critsPremium >= 4) parts.push({ label: "Combo premium (4 critères)", value: 1.20 });
  else if (critsPremium === 3) parts.push({ label: "Combo premium (3 critères)", value: 1.12 });
  else if (critsPremium === 2) parts.push({ label: "Combo premium (2 critères)", value: 1.06 });

  const rawTotal = parts.reduce((acc, p) => acc * p.value, 1);
  const total = Math.min(rawTotal, 1.60); // plafond obligatoire
  return { parts, rawTotal, total };
}

// ─────────────────────────────────────────────────────────────
// 5. Résultat complet
// ─────────────────────────────────────────────────────────────
export interface SeasonResult {
  saison: "basse" | "moyenne" | "haute";
  prix_nuit_eur: number;
  prix_weekend_eur: number;
  occupation_pct: number;
  nuits: number;
  revenu_eur: number;
}
export interface EstimationResult {
  category: Category;
  category_label: string;
  score: ScoreBreakdown;
  price_percentile: "p50" | "p70" | "p85";
  base_price_haute_eur: number;      // prix P chosi
  multiplier_total: number;
  multipliers_detail: { label: string; value: number }[];
  price_haute_eur: number;           // après multiplicateurs + plafonds
  saisons: SeasonResult[];           // 3 saisons dans l'ordre basse/moyenne/haute
  revenu_annuel_eur: number;
  revenu_annuel_optimise_eur: number;
  uplift_pct: number;
  fourchettes_annuelles: { p50: number; p70: number; p85: number };
  calibration: "none" | "airdna" | "marche_ia" | "airdna_marche_ia";
  meta: { partie_villa_coef: number; capped_p85: boolean; capped_mult: boolean };
}

function roundEur(x: number) { return Math.round(x); }
function occByScore(base: number, plage: number, norm: number) {
  // norm ∈ [0,1] → décalage centré sur 0.5.
  return Math.max(0.05, Math.min(0.95, base + (norm - 0.5) * plage));
}

export function estimate(form: EstimationFormData): EstimationResult {
  const category = categorize(form);
  const score = scoreProperty(form);
  const base = BASE_PRICE_HAUTE[category];
  const percentile: "p50" | "p70" | "p85" =
    score.normalized < 0.40 ? "p50" : score.normalized < 0.70 ? "p70" : "p85";
  const basePrice = base[percentile];

  const mult = multipliers(form);
  let priceHaute = basePrice * mult.total;
  const p85Cap = base.p85 * 1.30;
  const capped_p85 = priceHaute > p85Cap;
  if (capped_p85) priceHaute = p85Cap;
  if (priceHaute < PLANCHER_HAUTE[category]) priceHaute = PLANCHER_HAUTE[category];

  const partieVillaCoef = form.bien.type === "partie_villa" ? 0.65 : 1;
  priceHaute = priceHaute * partieVillaCoef;

  // Saisons
  const ratioM = RATIO_MOYENNE[category];
  const ratioB = RATIO_BASSE[category];
  const prixMoyenne = priceHaute * ratioM;
  const prixBasse = priceHaute * ratioB;

  const occ = {
    basse: occByScore(OCC_BASE.basse, OCC_PLAGE.basse, score.normalized),
    moyenne: occByScore(OCC_BASE.moyenne, OCC_PLAGE.moyenne, score.normalized),
    haute: occByScore(OCC_BASE.haute, OCC_PLAGE.haute, score.normalized),
  };

  const mkSeason = (
    saison: "basse" | "moyenne" | "haute", prix: number,
  ): SeasonResult => {
    const capNuits = NUITEES_POTENTIELLES[saison];
    const nuits = Math.round(capNuits * occ[saison]);
    return {
      saison,
      prix_nuit_eur: roundEur(prix),
      prix_weekend_eur: roundEur(prix * 2 * 1.10), // 2 nuits + 10 %
      occupation_pct: Math.round(occ[saison] * 100),
      nuits,
      revenu_eur: roundEur(prix * nuits),
    };
  };
  const saisons: SeasonResult[] = [
    mkSeason("basse", prixBasse),
    mkSeason("moyenne", prixMoyenne),
    mkSeason("haute", priceHaute),
  ];
  let revenuAnnuel = saisons.reduce((s, r) => s + r.revenu_eur, 0);

  // Fusion AirDNA
  const airdna = form.donnees_marche.airdna;
  const hasAirdna = airdna && (airdna.adr_eur != null || airdna.revenu_annuel_eur != null);
  const hasMarcheIa = !!form.donnees_marche.marche_ia?.enabled;

  if (hasAirdna && airdna) {
    if (airdna.adr_eur != null) {
      // prix = 60 % moteur + 40 % (ADR × 1.40)
      const priceHauteFused = priceHaute * 0.60 + airdna.adr_eur * 1.40 * 0.40;
      // Rebuild saisons avec le prix fusionné
      const prixMoyenneFused = priceHauteFused * ratioM;
      const prixBasseFused = priceHauteFused * ratioB;
      saisons[0] = mkSeason("basse", prixBasseFused);
      saisons[1] = mkSeason("moyenne", prixMoyenneFused);
      saisons[2] = mkSeason("haute", priceHauteFused);
    }
    const revMoteur = saisons.reduce((s, r) => s + r.revenu_eur, 0);
    if (airdna.revenu_annuel_eur != null) {
      revenuAnnuel = Math.round(revMoteur * 0.50 + airdna.revenu_annuel_eur * 0.50);
    } else {
      revenuAnnuel = revMoteur;
    }
  }

  // Scénario optimisé : prix ×(1.08 + (1−norm)×0.10), occupation +5 à +10 pts,
  // uplift final plafonné à +35 %.
  const priceUpliftFactor = 1.08 + (1 - score.normalized) * 0.10;
  const occBonus = 0.05 + score.normalized * 0.05; // 5 → 10 pts
  const revenuOptimiseBrut = saisons.reduce((sum, r) => {
    const optPrix = r.prix_nuit_eur * priceUpliftFactor;
    const optOcc = Math.min(0.95, r.occupation_pct / 100 + occBonus);
    const optNuits = Math.round(NUITEES_POTENTIELLES[r.saison] * optOcc);
    return sum + optPrix * optNuits;
  }, 0);
  const revenuOptimise = Math.min(revenuOptimiseBrut, revenuAnnuel * 1.35);

  // Fourchettes annuelles P50/P70/P85 : recompute annual revenue with the
  // base P50/P70/P85 (mêmes multiplicateurs & saisons), sans fusion AirDNA.
  const buildRevenueForPrice = (haute: number) => {
    const m = haute * ratioM;
    const b = haute * ratioB;
    return roundEur(
      haute * Math.round(NUITEES_POTENTIELLES.haute * occ.haute) +
      m     * Math.round(NUITEES_POTENTIELLES.moyenne * occ.moyenne) +
      b     * Math.round(NUITEES_POTENTIELLES.basse * occ.basse),
    );
  };
  const cap = (h: number) => {
    let v = h * mult.total;
    if (v > p85Cap) v = p85Cap;
    if (v < PLANCHER_HAUTE[category]) v = PLANCHER_HAUTE[category];
    return v * partieVillaCoef;
  };
  const fourchettes = {
    p50: buildRevenueForPrice(cap(base.p50)),
    p70: buildRevenueForPrice(cap(base.p70)),
    p85: buildRevenueForPrice(cap(base.p85)),
  };

  const calibration =
    hasAirdna && hasMarcheIa ? "airdna_marche_ia" :
    hasAirdna ? "airdna" :
    hasMarcheIa ? "marche_ia" : "none";

  return {
    category,
    category_label: CATEGORY_LABEL[category],
    score,
    price_percentile: percentile,
    base_price_haute_eur: roundEur(basePrice),
    multiplier_total: mult.total,
    multipliers_detail: mult.parts,
    price_haute_eur: roundEur(priceHaute * partieVillaCoef),
    saisons,
    revenu_annuel_eur: roundEur(revenuAnnuel),
    revenu_annuel_optimise_eur: roundEur(revenuOptimise),
    uplift_pct: Math.round((revenuOptimise / revenuAnnuel - 1) * 100),
    fourchettes_annuelles: fourchettes,
    calibration,
    meta: {
      partie_villa_coef: partieVillaCoef,
      capped_p85,
      capped_mult: mult.rawTotal > 1.60,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 6. Utilitaires exposés (utile pour tests + rapport)
// ─────────────────────────────────────────────────────────────
export const ENGINE_CONSTANTS = {
  BASE_PRICE_HAUTE, PLANCHER_HAUTE, RATIO_MOYENNE, RATIO_BASSE,
  NUITEES_POTENTIELLES, OCC_BASE, OCC_PLAGE,
} as const;
export { CATEGORY_LABEL };
export type { AirdnaData };

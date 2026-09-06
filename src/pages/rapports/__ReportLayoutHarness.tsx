// TEMPORAIRE — banc de test visuel de la mise en page du rapport (aucun impact métier).
import OwnerReportDocument from "@/components/estimation/report/OwnerReportDocument";
import { buildReportData } from "@/lib/estimation-locative/report-data";

const engine = {
  version: "1", computed_at: "2026-01-01T00:00:00.000Z", status: "ok", unknowns: [], alerts: [],
  market: { baseline_adr: { value: 210, source: "RDNA" }, baseline_occupancy: { value: 0.58, source: "RDNA" },
    rdna_adr: 210, rdna_occupancy: 58, comparables_adr: 220, comparables_occupancy: 55, penetration: {}, sources_used: ["RDNA"] },
  comparables: [], property_score: { total: 72, axes: {}, axes_used: [], axes_missing: [] },
  positioning: { key: "premium", label: "Premium", price_factor: 1.18 },
  adjustments: { items: [], total_pct: 0 },
  pricing: { reference_adr: 210, elasticity: -1.2, elasticity_source: "DEFAULT", optimal_adr: 240, optimal_adr_before_guardrails: 250, guardrail_applied: null, curve: [] },
  seasons: {
    basse: { key: "basse", label: "Basse saison", nights_total: 120, nights_sellable: 120, price_math: 70, price_recommended: 70, price_min: 60, price_max: 80, occupancy_pct: 32, nights_booked: 42, revenue: 6258 },
    moyenne: { key: "moyenne", label: "Moyenne saison", nights_total: 150, nights_sellable: 150, price_math: 175, price_recommended: 175, price_min: 150, price_max: 205, occupancy_pct: 52, nights_booked: 90, revenue: 19710 },
    haute: { key: "haute", label: "Très haute saison", nights_total: 95, nights_sellable: 95, price_math: 300, price_recommended: 300, price_min: 259, price_max: 349, occupancy_pct: 80, nights_booked: 81, revenue: 26649 },
  },
  annual: { nights_year: 365, nights_blocked: 0, nights_sellable: 365, nights_booked: 213, occupancy_pct: 58, adr_weighted: 247, revenue: 52617,
    breakdown: [
      { label: "Basse saison", nights: 42, occupancy_pct: 32, adr: 70, revenue: 6258 },
      { label: "Moyenne saison", nights: 90, occupancy_pct: 52, adr: 175, revenue: 19710 },
      { label: "Très haute saison", nights: 81, occupancy_pct: 80, adr: 300, revenue: 26649 },
    ] },
  confidence: { score: 71, factors: [] },
  coherence: { rdna_adr: 210, comparables_adr: 220, model_adr: 247, max_divergence_pct: 12, verdict: "coherent" },
  trace: [],
};

const LONG = "Villa contemporaine exceptionnelle avec vue mer panoramique, piscine chauffée à débordement, jardin méditerranéen arboré et prestations haut de gamme entièrement rénovées";

const estimation: any = {
  id: "e1", reference: "AKP-2026-0002",
  address: "128 boulevard Alphonse Juin — résidence des Terrasses du Golfe de Saint-Tropez, bâtiment C",
  city: "Roquebrune-sur-Argens-sur-Mer-et-Montagne", postal_code: "83520",
  property_type: "Villa", property_title: LONG,
  features: { chambres: 3, salles_de_bain: 2, couchages: 6, surface_interieure_m2: 120, piscine: "privee", vue: "mer_panoramique", exterieurs: ["Jardin arboré", "Terrasse en pierre"], equipements: ["Climatisation", "Wifi fibre"] },
  constraints: {}, engine_output: engine,
  owner: { first_name: "Marie-Christine", last_name: "de la Fontaine-Duverger" },
  location: { district: "Boulouris", pois: [{ name: "Plage du Débarquement et sentier du littoral", category: "Plage", distance_m: 320 }] },
  recommendations: null,
};

const comparables = Array.from({ length: 14 }, (_, i) => ({
  id: `c${i}`, origin: "web", name: `Logement comparable numéro ${i} avec un nom particulièrement long qui doit revenir à la ligne`,
  city: "Saint-Raphaël", displayed_price: 200 + i, bedrooms: 3, capacity: 6, is_primary: true,
  similarity_score: 80 - i, platform: "Airbnb", observed_at: "2026-01-20T00:00:00Z",
}));

export default function ReportLayoutHarness() {
  const data = buildReportData({ estimation, photos: [] as any, comparables: comparables as any, now: new Date("2026-02-01T10:00:00Z") });
  return <OwnerReportDocument data={data} photoUrls={{}} preview />;
}

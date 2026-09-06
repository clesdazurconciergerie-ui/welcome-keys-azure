import { describe, expect, it } from "vitest";
import { buildReportData, validateReportData, hasBlockingIssue } from "./report-data";

const engine = (over: any = {}) => ({
  version: "1", computed_at: "2026-01-01T00:00:00.000Z", status: "ok", unknowns: [], alerts: [],
  market: { baseline_adr: { value: 210, source: "RDNA" }, baseline_occupancy: { value: 0.58, source: "RDNA" },
    rdna_adr: 210, rdna_occupancy: 58, comparables_adr: 220, comparables_occupancy: 55,
    penetration: {}, sources_used: ["RDNA"] },
  comparables: [], property_score: { total: 72, axes: {}, axes_used: [], axes_missing: [] },
  positioning: { key: "premium", label: "Premium", price_factor: 1.18 },
  adjustments: { items: [], total_pct: 0 },
  pricing: { reference_adr: 210, elasticity: -1.2, elasticity_source: "DEFAULT", optimal_adr: 240,
    optimal_adr_before_guardrails: 250, guardrail_applied: null, curve: [] },
  seasons: {
    basse: { key: "basse", label: "Basse saison", nights_total: 120, nights_sellable: 120, price_math: 150,
      price_recommended: 149, price_min: 130, price_max: 170, occupancy_pct: 35, nights_booked: 42, revenue: 6258 },
    moyenne: { key: "moyenne", label: "Moyenne saison", nights_total: 150, nights_sellable: 150, price_math: 220,
      price_recommended: 219, price_min: 195, price_max: 245, occupancy_pct: 60, nights_booked: 90, revenue: 19710 },
    haute: { key: "haute", label: "Très haute saison", nights_total: 95, nights_sellable: 95, price_math: 330,
      price_recommended: 329, price_min: 300, price_max: 370, occupancy_pct: 85, nights_booked: 81, revenue: 26649 },
  },
  annual: { nights_year: 365, nights_blocked: 0, nights_sellable: 365, nights_booked: 213,
    occupancy_pct: 58, adr_weighted: 247, revenue: 52617,
    breakdown: [
      { label: "Basse saison", nights: 42, occupancy_pct: 35, adr: 149, revenue: 6258 },
      { label: "Moyenne saison", nights: 90, occupancy_pct: 60, adr: 219, revenue: 19710 },
      { label: "Très haute saison", nights: 81, occupancy_pct: 85, adr: 329, revenue: 26649 },
    ] },
  confidence: { score: 71, factors: [] },
  coherence: { rdna_adr: 210, comparables_adr: 220, model_adr: 247, max_divergence_pct: 12, verdict: "coherent" },
  trace: [],
  ...over,
});

const baseEstimation = (over: any = {}) => ({
  id: "e1", reference: "EST-0001", address: "12 avenue des Golfs", city: "Saint-Raphaël",
  property_type: "Villa", features: { chambres: 3, salles_de_bain: 2, couchages: 6, surface_interieure_m2: 120, piscine: "privee", vue: "mer_panoramique" },
  constraints: {}, engine_output: engine(),
  owner: { first_name: "Marie", last_name: "Dupont" },
  ...over,
});

const build = (est: any, photos: any[] = [], comps: any[] = []) =>
  buildReportData({ estimation: est as any, photos: photos as any, comparables: comps, now: new Date("2026-02-01T10:00:00Z") });

describe("buildReportData", () => {
  it("restitue les chiffres du moteur sans les recalculer", () => {
    const d = build(baseEstimation());
    expect(d.synthesis.annual_revenue).toBe(52617);
    expect(d.synthesis.adr_weighted).toBe(247);
    expect(d.pricing.seasons.map((s) => s.price_recommended)).toEqual([149, 219, 329]);
    expect(hasBlockingIssue(validateReportData(d, engine() as any))).toBe(false);
  });

  it("villa avec piscine privée et vue mer : les caractéristiques sont lisibles", () => {
    const d = build(baseEstimation());
    const facts = Object.fromEntries(d.property.facts.map((f) => [f.key, f.value]));
    expect(facts.piscine).toBe("Privée");
    expect(facts.vue).toBe("Vue mer panoramique");
    expect(facts.couchages).toBe("6 personnes");
  });

  it("appartement sans données : les inconnues restent inconnues", () => {
    const d = build(baseEstimation({ property_type: "Appartement", features: {}, engine_output: null }));
    const facts = Object.fromEntries(d.property.facts.map((f) => [f.key, f.value]));
    expect(facts.piscine).toBeNull();
    expect(facts.surface_interieure_m2).toBeNull();
    expect(d.synthesis.annual_revenue).toBeNull();
    expect(d.pages).not.toContain("synthesis");
    expect(d.pages).not.toContain("pricing");
    expect(d.pages).toContain("conclusion");
  });

  it("comparables insuffisants : la page n'est pas rendue", () => {
    const d = build(baseEstimation());
    expect(d.pages).not.toContain("comparables");
  });

  it("les comparables retenus portent une mention de prix affiché", () => {
    const d = build(baseEstimation(), [], [
      { id: "c1", origin: "web", name: "Villa Azur", city: "Fréjus", displayed_price: 260, bedrooms: 3, is_primary: true, similarity_score: 82, platform: "Airbnb", observed_at: "2026-01-20T00:00:00Z" },
      { id: "c2", origin: "rdna", name: "Comparable RDNA", displayed_price: 230, is_primary: true, similarity_score: 66 },
    ]);
    expect(d.comparables.online).toHaveLength(1);
    expect(d.comparables.market).toHaveLength(1);
    expect(d.comparables.online[0].similarity_label).toBe("Très proche");
    expect(d.comparables.disclaimer.length).toBeGreaterThan(20);
    expect(d.pages).toContain("comparables");
  });

  it("n'expose aucune donnée interne", () => {
    const d = build(baseEstimation());
    const checks = validateReportData(d, engine() as any);
    expect(checks.find((c) => c.key === "internal")?.level).toBe("ok");
    const json = JSON.stringify(d);
    expect(json).not.toMatch(/elasticity|curve|confidence|guardrail/i);
  });

  it("signale un écart avec le moteur", () => {
    const d = build(baseEstimation());
    d.synthesis.annual_revenue = 99999;
    const checks = validateReportData(d, engine() as any);
    expect(hasBlockingIssue(checks)).toBe(true);
  });

  it("ne retient que les photos validées", () => {
    const d = build(baseEstimation(), [
      { id: "p1", storage_path: "a.jpg", is_cover: true, selected_for_report: true, quality_score: 80 },
      { id: "p2", storage_path: "b.jpg", selected_for_report: false, quality_score: 30, ai_usable: false },
      { id: "p3", storage_path: "c.jpg", selected_for_report: true, quality_score: 70 },
    ]);
    expect(d.cover.photo?.id).toBe("p1");
    expect(d.property.photos.map((p) => p.id)).toEqual(["p3"]);
  });
});

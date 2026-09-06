// MODULE — Estimation locative · tests du moteur (§30)
// Exécution : bunx vitest run src/lib/estimation-locative/engine.test.ts
//        ou : bun test src/lib/estimation-locative/engine.test.ts
import { describe, expect, it } from "vitest";
import { runEngine, applyOverrides, psychologicalPrice, toOwnerReportData, type EngineInput } from "./engine";
import { DEFAULT_ENGINE_CONFIG } from "./engine-config";
import type { ComparableInput } from "./engine-types";

const comp = (i: number, over: Partial<ComparableInput> = {}): ComparableInput => ({
  id: `c${i}`,
  name: `Comparable ${i}`,
  adr: 150 + i * 5,
  occupancy_pct: 62 - i,
  bedrooms: 2,
  capacity: 4,
  bathrooms: 1,
  property_type: "Appartement",
  city: "Saint-Raphaël",
  distance_m: 500 + i * 100,
  pool: "Piscine commune",
  parking: "Parking résidence",
  view: "Vue mer partielle",
  ac: "Toutes les pièces",
  ...over,
});

const base = (over: Partial<EngineInput> = {}): EngineInput => ({
  city: "Saint-Raphaël",
  property_type: "Appartement",
  lat: 43.42,
  lng: 6.77,
  location_data: { distance_mer_m: 400, distance_plage_m: 400, distance_centre_m: 900 },
  features: {
    chambres: 2, couchages: 4, salles_de_bain: 1, surface_interieure_m2: 55,
    vue: "Vue mer partielle", piscine: "Piscine commune", parking: "Parking résidence",
    climatisation: "Toutes les pièces", wifi: "Oui", exterieurs: ["Terrasse"],
    equipements: ["Lave-linge", "TV"],
  },
  constraints: {},
  ai_scores: { standing: 62, etat: 65, design: 60, equipements: 63, localisation: 70, exterieurs: 58, vue: 66, qualite_percue: 62 },
  rdna_data: { adr_eur: 160, occupation_pct: 60, currency: "EUR" },
  market_data: { penetration: { "Air Conditioning": 73, Parking: 87, Pool: 40, "Wireless Internet": 93 } },
  photos_count: 10,
  comparables: Array.from({ length: 6 }, (_, i) => comp(i)),
  ...over,
});

const sane = (out: ReturnType<typeof runEngine>) => {
  for (const k of ["basse", "moyenne", "haute"] as const) {
    const s = out.seasons[k];
    if (s.price_recommended === null) continue;
    expect(s.price_recommended).toBeGreaterThan(0);
    expect(s.price_min!).toBeLessThanOrEqual(s.price_recommended);
    expect(s.price_max!).toBeGreaterThanOrEqual(s.price_recommended);
    expect(s.occupancy_pct!).toBeGreaterThanOrEqual(0);
    expect(s.occupancy_pct!).toBeLessThanOrEqual(100);
  }
  if (out.annual.revenue !== null) {
    expect(out.annual.revenue).toBeGreaterThan(0);
    expect(out.annual.occupancy_pct!).toBeLessThanOrEqual(100);
  }
  expect(out.confidence.score).toBeGreaterThanOrEqual(0);
  expect(out.confidence.score).toBeLessThanOrEqual(100);
};

describe("moteur d'estimation locative", () => {
  it("appartement standard : produit une estimation cohérente avec le marché", () => {
    const out = runEngine(base());
    expect(out.status).toBe("ok");
    sane(out);
    const baseline = out.market.baseline_adr.value!;
    expect(out.pricing.optimal_adr!).toBeGreaterThan(baseline * 0.6);
    expect(out.pricing.optimal_adr!).toBeLessThan(baseline * 1.5);
    expect(out.seasons.haute.price_recommended!).toBeGreaterThan(out.seasons.basse.price_recommended!);
  });

  it("appartement premium : mieux positionné qu'un bien d'entrée de gamme", () => {
    const premium = runEngine(base({ ai_scores: { standing: 92, etat: 94, design: 90, equipements: 88, localisation: 85, exterieurs: 88, vue: 90, qualite_percue: 91 } }));
    const entree = runEngine(base({ ai_scores: { standing: 30, etat: 28, design: 25, equipements: 32, localisation: 45, exterieurs: 20, vue: 25, qualite_percue: 28 } }));
    expect(premium.positioning?.key).toBe("tres_premium");
    expect(entree.positioning?.key).toBe("entree");
    expect(premium.pricing.optimal_adr!).toBeGreaterThan(entree.pricing.optimal_adr!);
    sane(premium); sane(entree);
  });

  it("villa avec piscine privée : valorisée davantage qu'une piscine commune", () => {
    const privee = runEngine(base({ property_type: "Villa", features: { ...base().features, piscine: "Piscine privée" } }));
    const commune = runEngine(base({ property_type: "Villa", features: { ...base().features, piscine: "Piscine commune" } }));
    const gPrivee = privee.adjustments.items.find((i) => i.key === "piscine")!.applied_pct;
    const gCommune = commune.adjustments.items.find((i) => i.key === "piscine")!.applied_pct;
    expect(gPrivee).toBeGreaterThan(gCommune);
    sane(privee);
  });

  it("vue mer panoramique : valorisée davantage qu'une absence de vue", () => {
    const pano = runEngine(base({ features: { ...base().features, vue: "Vue mer panoramique" } }));
    const sans = runEngine(base({ features: { ...base().features, vue: "Aucune" } }));
    expect(pano.pricing.optimal_adr!).toBeGreaterThan(sans.pricing.optimal_adr!);
    sane(pano); sane(sans);
  });

  it("parking : l'absence pénalise sur un marché où il est standard (87 %)", () => {
    const avec = runEngine(base({ features: { ...base().features, parking: "Garage" } }));
    const sans = runEngine(base({ features: { ...base().features, parking: "Aucun" } }));
    const penalite = sans.adjustments.items.find((i) => i.key === "parking")!;
    expect(penalite.applied_pct).toBeLessThan(0);
    expect(avec.pricing.optimal_adr!).toBeGreaterThan(sans.pricing.optimal_adr!);
  });

  it("beaucoup de données vs peu de données : la confiance suit", () => {
    const riche = runEngine(base({ photos_count: 20 }));
    const pauvre = runEngine(base({
      photos_count: 0, ai_scores: {}, rdna_data: {}, market_data: {},
      comparables: [comp(0)],
    }));
    expect(riche.confidence.score).toBeGreaterThan(pauvre.confidence.score);
  });

  it("aucune donnée de marché : renvoie UNKNOWN, n'invente rien", () => {
    const out = runEngine(base({ rdna_data: {}, comparables: [] }));
    expect(out.status).toBe("insufficient_data");
    expect(out.pricing.optimal_adr).toBeNull();
    expect(out.annual.revenue).toBeNull();
    expect(out.seasons.haute.price_recommended).toBeNull();
    expect(out.unknowns).toContain("market_baseline_adr");
  });

  it("données contradictoires : lève une alerte de conflit et abaisse la confiance", () => {
    const out = runEngine(base({
      rdna_data: { adr_eur: 90, occupation_pct: 60 },
      comparables: Array.from({ length: 6 }, (_, i) => comp(i, { adr: 320 + i * 5 })),
    }));
    expect(out.coherence.verdict).toBe("conflit");
    expect(out.alerts.some((a) => a.level === "critical")).toBe(true);
    sane(out);
  });

  it("nuits propriétaire bloquées : réduit les nuits commercialisables et le CA", () => {
    const libre = runEngine(base());
    const bloque = runEngine(base({ constraints: { nuits_bloquees: 90 } }));
    expect(bloque.annual.nights_sellable).toBe(275);
    expect(bloque.annual.revenue!).toBeLessThan(libre.annual.revenue!);
    sane(bloque);
  });

  it("minimum 7 nuits : occupation plus faible qu'en séjours flexibles", () => {
    const flex = runEngine(base({ constraints: { duree_minimale: "Flexible" } }));
    const semaine = runEngine(base({ constraints: { duree_minimale: "7 nuits" } }));
    expect(semaine.annual.occupancy_pct!).toBeLessThan(flex.annual.occupancy_pct!);
  });

  it("surface inconnue et comparables sans surface : reste stable", () => {
    const out = runEngine(base({
      features: { ...base().features, surface_interieure_m2: null },
      comparables: Array.from({ length: 5 }, (_, i) => comp(i, { surface_m2: null })),
    }));
    expect(out.status).toBe("ok");
    sane(out);
  });

  it("aucun comparable externe mais RDNA disponible : calcule quand même", () => {
    const out = runEngine(base({ comparables: [] }));
    expect(out.status).toBe("ok");
    expect(out.market.sources_used).toEqual(["RDNA"]);
    sane(out);
  });

  it("comparable aberrant : écarté du baseline", () => {
    const out = runEngine(base({
      comparables: [...Array.from({ length: 6 }, (_, i) => comp(i)), comp(9, { adr: 2400 })],
    }));
    const ab = out.comparables.find((c) => c.id === "c9")!;
    expect(ab.outlier || !ab.used).toBe(true);
    expect(out.market.comparables_adr!).toBeLessThan(400);
  });

  it("garde-fou : jamais très au-dessus du marché", () => {
    const out = runEngine(base({ ai_scores: { standing: 100, etat: 100, design: 100, equipements: 100, localisation: 100, exterieurs: 100, vue: 100, qualite_percue: 100 }, features: { ...base().features, vue: "Vue mer panoramique", piscine: "Piscine privée", parking: "Garage" } }));
    const baseline = out.market.baseline_adr.value!;
    const max = baseline * (1 + DEFAULT_ENGINE_CONFIG.guardrails.max_above_market_pct / 100);
    expect(out.pricing.optimal_adr!).toBeLessThanOrEqual(Math.round(max) + 1);
  });

  it("prix psychologiques : arrondis commerciaux proches du prix mathématique", () => {
    const p = psychologicalPrice(183.47, DEFAULT_ENGINE_CONFIG);
    expect([179, 180, 185, 187, 189]).toContain(p);
    expect(Math.abs(p - 183.47)).toBeLessThan(183.47 * 0.031);
  });

  it("frais de ménage élevés : pèsent sur l'occupation, jamais sur le revenu du bien", () => {
    const bas = runEngine(base({ constraints: { prix_menage_eur: 20 } }));
    const haut = runEngine(base({ constraints: { prix_menage_eur: 150 } }));
    expect(haut.annual.occupancy_pct!).toBeLessThanOrEqual(bas.annual.occupancy_pct!);
    const owner = toOwnerReportData(haut);
    expect(JSON.stringify(owner)).not.toContain("menage");
  });

  it("corrections manuelles : recalculent le CA et gardent la valeur calculée", () => {
    const out = runEngine(base());
    const calc = out.seasons.haute.price_recommended!;
    const fixed = applyOverrides(out, {
      "haute.price_recommended": { value: calc + 40, computed: calc, at: new Date().toISOString() },
    });
    expect(fixed.seasons.haute.price_recommended).toBe(calc + 40);
    expect(fixed.annual.revenue!).toBeGreaterThan(out.annual.revenue!);
  });

  it("rapport propriétaire : ne contient aucune donnée interne", () => {
    const out = runEngine(base({ constraints: { prix_menage_eur: 90 } }));
    const owner = toOwnerReportData(out) as any;
    expect(owner.confidence).toBeUndefined();
    expect(owner.alerts).toBeUndefined();
    expect(JSON.stringify(owner)).not.toContain("elasticity");
    expect(owner.ca_annuel).not.toBeUndefined();
  });

  it("conversion USD → EUR : jamais de mélange de devises", () => {
    const usd = runEngine(base({ rdna_data: { adr: 200, occupation_pct: 60, currency: "USD" }, comparables: [] }));
    expect(usd.market.rdna_adr).toBeCloseTo(200 * DEFAULT_ENGINE_CONFIG.currency.usd_to_eur, 1);
  });
});

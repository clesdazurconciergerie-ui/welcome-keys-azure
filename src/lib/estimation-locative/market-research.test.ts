import { describe, it, expect } from "vitest";
import {
  normalizePoolKind, normalizeViewKind, normalizeParkingKind, normalizeAcKind,
  normalizeExteriorKind, normalizePlatform, haversineMeters, formatDistance,
  scoreComparable, selectComparables, buildMarketSnapshot, computeAmenityPenetration,
  computeDataQuality, contrastSources, freshnessWeight, phraseNuisance,
  toEngineMarketPayload, normalizeWebCandidate,
  INSUFFICIENT_WEB_MESSAGE, INSUFFICIENT_RELIABLE_MESSAGE, DISPLAYED_PRICE_DISCLAIMER,
  MIN_PENETRATION_SAMPLE,
  type MarketComparable, type SubjectProfile,
} from "./market-research";

const subject: SubjectProfile = {
  city: "Saint-Raphaël", district: "Boulouris", lat: 43.4184, lng: 6.8339,
  property_type: "villa", bedrooms: 3, capacity: 6, bathrooms: 2, surface_m2: 100,
  pool_kind: "privee", view_kind: "mer_panoramique", parking_kind: "prive",
  ac_kind: "totale", exterior_kind: "terrasse",
  amenities: ["wifi", "lave_linge", "barbecue"], standing: 78,
  distance_sea_m: 300, distance_center_m: 2000,
};

const base: MarketComparable = {
  id: "c1", origin: "web", name: "Villa test", platform: "airbnb", url: "https://airbnb.com/x",
  property_type: "villa", bedrooms: 3, capacity: 6, bathrooms: 2, surface_m2: 100,
  city: "Saint-Raphaël", district: "Boulouris", lat: 43.4190, lng: 6.8345, distance_m: null,
  pool_kind: "privee", view_kind: "mer_panoramique", parking_kind: "prive", ac_kind: "totale",
  exterior_kind: "terrasse", amenities: ["wifi", "lave_linge", "barbecue"],
  rating: 4.9, reviews_count: 120, displayed_price: 320, cleaning_fee: 90, other_fees: null,
  total_stay_price: 2330, actual_revenue: null, occupancy_pct: null, annual_revenue: null,
  currency: "EUR", observed_at: new Date().toISOString(), standing: 80,
  distance_sea_m: 320, distance_center_m: 2100,
  excluded: false, not_relevant: false, kept_manually: false,
};

const make = (patch: Partial<MarketComparable>, id: string): MarketComparable =>
  ({ ...base, ...patch, id });

describe("normalisations strictes", () => {
  it("distingue piscine privée et piscine commune (§7)", () => {
    expect(normalizePoolKind("Piscine privée")).toBe("privee");
    expect(normalizePoolKind("shared pool")).toBe("commune");
    expect(normalizePoolKind("piscine chauffée")).toBe("chauffee");
    expect(normalizePoolKind("piscine")).toBe("inconnue");
    expect(normalizePoolKind("")).toBe("inconnue");
    expect(normalizePoolKind("sans piscine")).toBe("aucune");
  });

  it("distingue vue mer partielle et panoramique (§8)", () => {
    expect(normalizeViewKind("vue mer")).toBe("mer_partielle");
    expect(normalizeViewKind("Vue mer panoramique")).toBe("mer_panoramique");
    expect(normalizeViewKind("aucune vue")).toBe("aucune");
    expect(normalizeViewKind("un truc")).toBe("inconnue");
  });

  it("normalise parking, climatisation, extérieur, plateforme", () => {
    expect(normalizeParkingKind("Garage fermé")).toBe("garage");
    expect(normalizeParkingKind("stationnement dans la rue")).toBe("rue");
    expect(normalizeAcKind("climatisation partielle")).toBe("partielle");
    expect(normalizeAcKind("")).toBe("inconnue");
    expect(normalizeExteriorKind("grand jardin")).toBe("jardin");
    expect(normalizePlatform("https://www.abritel.fr/x")).toBe("vrbo");
    expect(normalizePlatform("")).toBeNull();
  });
});

describe("distance (§6)", () => {
  it("calcule une distance et refuse d'inventer", () => {
    const d = haversineMeters({ lat: 43.4184, lng: 6.8339 }, { lat: 43.4190, lng: 6.8345 });
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(120);
    expect(haversineMeters({ lat: null, lng: null }, { lat: 43, lng: 6 })).toBeNull();
  });

  it("formate en mètres puis en kilomètres", () => {
    expect(formatDistance(450)).toBe("450 m");
    expect(formatDistance(2500)).toBe("2.5 km");
    expect(formatDistance(null)).toBe("Distance inconnue");
  });
});

describe("score de similarité (§5)", () => {
  it("note très haut un bien quasi identique et proche", () => {
    const s = scoreComparable(subject, base);
    expect(s.score).toBeGreaterThan(90);
    expect(s.missing).toHaveLength(0);
  });

  it("pénalise une piscine commune face à une piscine privée (§7)", () => {
    const shared = scoreComparable(subject, make({ pool_kind: "commune" }, "c2"));
    expect(shared.score).toBeLessThan(scoreComparable(subject, base).score);
  });

  it("pénalise l'absence de vue mer (§8)", () => {
    const noView = scoreComparable(subject, make({ view_kind: "aucune" }, "c3"));
    const partial = scoreComparable(subject, make({ view_kind: "mer_partielle" }, "c4"));
    expect(noView.score).toBeLessThan(partial.score);
  });

  it("préfère un bien à 500 m très similaire à un bien à 200 m très différent (§5)", () => {
    const close = make({
      id: "close", lat: 43.4166, lng: 6.8339, distance_m: 200, bedrooms: 1, capacity: 2,
      surface_m2: 32, pool_kind: "aucune", view_kind: "ville", parking_kind: "rue",
      ac_kind: "aucune", exterior_kind: "balcon", property_type: "studio",
      standing: 35, amenities: ["wifi"], district: "Centre",
    }, "close");
    const far = make({ distance_m: 500 }, "far");
    expect(scoreComparable(subject, far).score)
      .toBeGreaterThan(scoreComparable(subject, close).score);
  });

  it("marque les axes non évaluables sans les inventer", () => {
    const partial = scoreComparable(subject, make({
      bedrooms: null, surface_m2: null, pool_kind: "inconnue", view_kind: "inconnue",
      amenities: [], standing: null, distance_sea_m: null, distance_center_m: null,
    }, "c5"));
    expect(partial.missing.length).toBeGreaterThan(4);
    expect(partial.coverage).toBeLessThan(1);
  });
});

describe("sélection (§4, §16, §29, §30)", () => {
  it("ne retient rien et le signale quand il n'y a aucun comparable", () => {
    const r = selectComparables(subject, []);
    expect(r.primary).toHaveLength(0);
    expect(r.sufficient).toBe(false);
    expect(r.message).toBe(INSUFFICIENT_WEB_MESSAGE);
  });

  it("avec un seul comparable, ne force pas la sélection", () => {
    const r = selectComparables(subject, [base]);
    expect(r.primary).toHaveLength(1);
    expect(r.sufficient).toBe(false);
    expect(r.message).toBe(INSUFFICIENT_RELIABLE_MESSAGE);
  });

  it("retient entre 3 et 6 comparables classés par pertinence", () => {
    const list = Array.from({ length: 9 }, (_, i) =>
      make({ surface_m2: 100 - i * 3, standing: 80 - i * 2 }, `c${i}`));
    const r = selectComparables(subject, list);
    expect(r.primary.length).toBe(6);
    expect(r.sufficient).toBe(true);
    const scores = r.primary.map((p) => p.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("écarte les biens très éloignés et très différents", () => {
    const far = make({
      lat: 43.12, lng: 5.93, distance_m: null, city: "Toulon", district: "Mourillon",
      property_type: "studio", bedrooms: 1, capacity: 2, surface_m2: 28,
      pool_kind: "aucune", view_kind: "ville", parking_kind: "aucun", ac_kind: "aucune",
      exterior_kind: "aucun", amenities: ["wifi"], standing: 30,
      distance_sea_m: 2500, distance_center_m: 300,
    }, "far");
    const r = selectComparables(subject, [far]);
    expect(r.primary).toHaveLength(0);
    expect(r.scored[0].reason).toContain("Similarité insuffisante");
  });

  it("respecte les décisions manuelles (§29)", () => {
    const weak = make({
      bedrooms: 1, capacity: 2, pool_kind: "aucune", view_kind: "aucune",
      standing: 30, kept_manually: true,
    }, "weak");
    const dropped = make({ not_relevant: true }, "dropped");
    const r = selectComparables(subject, [weak, dropped, base]);
    expect(r.primary.map((p) => p.comparable.id)).toContain("weak");
    expect(r.primary.map((p) => p.comparable.id)).not.toContain("dropped");
  });
});

describe("prix et frais (§9, §11)", () => {
  it("garde le prix affiché distinct du revenu réel", () => {
    const c = normalizeWebCandidate(
      { name: "X", price_per_night: "320 €", cleaning_fee: 90, total_price: 2330 },
      subject, { observed_at: "2026-09-01T00:00:00.000Z" },
    );
    expect(c.displayed_price).toBe(320);
    expect(c.cleaning_fee).toBe(90);
    expect(c.total_stay_price).toBe(2330);
    expect(c.actual_revenue).toBeNull();
  });

  it("laisse UNKNOWN les données absentes ou marquées inconnues", () => {
    const c = normalizeWebCandidate(
      { name: "Y", bedrooms: "unknown", rating: "", pool: "", view: "n/a" },
      subject, { observed_at: "2026-09-01T00:00:00.000Z" },
    );
    expect(c.bedrooms).toBeNull();
    expect(c.rating).toBeNull();
    expect(c.pool_kind).toBe("inconnue");
    expect(c.view_kind).toBe("inconnue");
    expect(c.observed_at).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("équipements du marché (§20)", () => {
  it("ne publie un pourcentage qu'avec un échantillon suffisant", () => {
    const few = computeAmenityPenetration([base, make({ pool_kind: "aucune" }, "b")]);
    expect(few.find((a) => a.key === "piscine")?.penetration).toBeNull();

    const many = computeAmenityPenetration([
      base, make({ pool_kind: "aucune" }, "b"), make({ pool_kind: "privee" }, "c"),
      make({ pool_kind: "commune" }, "d"), make({ pool_kind: "inconnue" }, "e"),
    ]);
    const pool = many.find((a) => a.key === "piscine")!;
    expect(pool.known).toBe(4);
    expect(pool.known).toBeGreaterThanOrEqual(MIN_PENETRATION_SAMPLE);
    expect(pool.penetration).toBe(75);
  });
});

describe("market snapshot (§19) et sources (§17, §18)", () => {
  const rdna = make({ origin: "rdna", platform: "rdna", displayed_price: 150 }, "r1");
  const web = [base, make({ displayed_price: 190 }, "w2"), make({ displayed_price: 260 }, "w3")];

  it("sépare RDNA et web, et expose la fourchette observée", () => {
    const snap = buildMarketSnapshot([rdna, ...web], web);
    expect(snap.rdna_count).toBe(1);
    expect(snap.web_count).toBe(3);
    expect(snap.displayed_price.min).toBe(190);
    expect(snap.displayed_price.max).toBe(320);
    expect(snap.rdna_adr.median).toBe(150);
    expect(snap.disclaimer).toBe(DISPLAYED_PRICE_DISCLAIMER);
  });

  it("contextualise un écart RDNA/web sans le traiter comme une contradiction (§18)", () => {
    const snap = buildMarketSnapshot([rdna, make({ displayed_price: 190 }, "w2")], []);
    const c = contrastSources(snap);
    expect(c.rdna_adr).toBe(150);
    expect(c.web_displayed_median).toBe(190);
    expect(c.gap_pct).toBeCloseTo(26.7, 1);
    expect(c.message).toContain("nature différente");
  });

  it("gère RDNA seul et web seul", () => {
    expect(contrastSources(buildMarketSnapshot([rdna], [])).message).toContain("sans prix affiché");
    expect(contrastSources(buildMarketSnapshot(web, web)).message).toContain("sans référence RDNA");
  });
});

describe("fraîcheur (§24) et qualité des données (§25)", () => {
  const now = new Date("2026-09-06T00:00:00.000Z");

  it("pondère plus une donnée récente qu'une donnée ancienne", () => {
    const recent = freshnessWeight("2026-09-01T00:00:00.000Z", now);
    const old = freshnessWeight("2024-01-01T00:00:00.000Z", now);
    expect(recent).toBe(1);
    expect(old).toBe(0.3);
    expect(recent).toBeGreaterThan(old);
    expect(freshnessWeight(null, now)).toBe(0.5);
  });

  it("note plus haut un jeu de données riche, récent et diversifié", () => {
    const good = selectComparables(subject, [
      base,
      make({ platform: "booking", displayed_price: 280 }, "g2"),
      make({ platform: "vrbo", displayed_price: 300 }, "g3"),
      make({ platform: "expedia", displayed_price: 290 }, "g4"),
    ]);
    const rich = computeDataQuality({ scored: good.scored, primary: good.primary, rdnaCount: 5, now });

    const poor = selectComparables(subject, [make({ observed_at: null }, "p1")]);
    const weak = computeDataQuality({ scored: poor.scored, primary: poor.primary, rdnaCount: 0, now });

    expect(rich.score).toBeGreaterThan(weak.score);
    expect(weak.notes).toContain(INSUFFICIENT_RELIABLE_MESSAGE);
    expect(weak.notes).toContain("Aucun comparable RDNA disponible.");
  });
});

describe("nuisances (§22) et événements (§23)", () => {
  it("reste prudent sur le bruit", () => {
    const p = phraseNuisance("route", "D559 à 80 m");
    expect(p).toContain("potentiel de nuisance à vérifier");
    expect(p).not.toContain("bruyant");
  });
});

describe("alimentation du moteur (§26)", () => {
  it("transmet comparables retenus, taux d'équipement et qualité, sans coefficient", () => {
    const list = [
      make({ origin: "rdna", platform: "rdna", displayed_price: 150 }, "r1"),
      base,
      make({ platform: "booking", displayed_price: 280 }, "g2"),
      make({ platform: "vrbo", displayed_price: 300, pool_kind: "aucune" }, "g3"),
      make({ platform: "expedia", displayed_price: 290 }, "g4"),
    ];
    const payload = toEngineMarketPayload(subject, list);
    expect(payload.comparables.length).toBeGreaterThanOrEqual(3);
    expect(payload.snapshot.analyzed).toBe(5);
    expect(payload.amenity_penetration.piscine).toBeGreaterThan(0);
    expect(payload.amenity_penetration.piscine).toBeLessThanOrEqual(1);
    expect(payload.data_quality.score).toBeGreaterThan(0);
    expect(Object.keys(payload)).not.toContain("price");
  });

  it("continue sans comparables web, en s'appuyant sur RDNA seul (§30)", () => {
    const payload = toEngineMarketPayload(subject, [
      make({ origin: "rdna", platform: "rdna", displayed_price: 150 }, "r1"),
      make({ origin: "rdna", platform: "rdna", displayed_price: 165 }, "r2"),
      make({ origin: "rdna", platform: "rdna", displayed_price: 180 }, "r3"),
    ]);
    expect(payload.snapshot.web_count).toBe(0);
    expect(payload.snapshot.rdna_adr.median).toBe(165);
    expect(payload.data_quality.score).toBeGreaterThan(0);
  });
});

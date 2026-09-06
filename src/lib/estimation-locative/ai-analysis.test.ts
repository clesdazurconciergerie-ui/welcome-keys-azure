// Tests de la couche d'analyse IA (étape 3) — §29 du cahier des charges.
import { describe, it, expect } from "vitest";
import {
  normalizeAiPayload, resolveFacts, factsToFeatures, toEngineAiScores,
  selectReportPhotos, compareToMarket, normalizeRdnaExtraction, rdnaToEngineData,
  buildPropertySummary, confidenceBand, normalizePool, normalizeView, isUnknownValue,
} from "./ai-analysis";

const meta = (n: number, failed = 0, errors: string[] = []) =>
  ({ photos_analyzed: n, photos_failed: failed, errors });

const payload = (over: any = {}, m = meta(3)) => normalizeAiPayload(over, m);

describe("normalisation IA — rien n'est inventé", () => {
  it("aucune photo : payload vide et exploitable", () => {
    const p = payload({}, meta(0));
    expect(p.photos_analyzed).toBe(0);
    expect(p.scores.STANDING_SCORE).toBeNull();
    expect(p.features).toEqual([]);
    expect(p.usp).toEqual([]);
  });

  it("une seule photo : les scores restent lisibles, la couverture est faible", () => {
    const p = payload({ scores: { STANDING_SCORE: 70, PHOTO_COVERAGE_SCORE: 15 } }, meta(1));
    expect(p.scores.STANDING_SCORE).toBe(70);
    expect(p.scores.PHOTO_COVERAGE_SCORE).toBe(15);
  });

  it("plusieurs photos : scores bornés 0-100", () => {
    const p = payload({ scores: { STANDING_SCORE: 143, DESIGN_SCORE: -20 } }, meta(8));
    expect(p.scores.STANDING_SCORE).toBe(100);
    expect(p.scores.DESIGN_SCORE).toBe(0);
  });

  it("UNKNOWN reste UNKNOWN et n'est jamais converti en ABSENT", () => {
    const p = payload({
      features: [
        { key: "climatisation", value: null, status: "not_observable", confidence: 0.2 },
        { key: "piscine", value: "unknown", confidence: 0.1 },
      ],
    });
    const clim = p.features.find((f) => f.key === "climatisation")!;
    expect(clim.status).toBe("not_observable");
    expect(clim.value).toBeNull();
    const pool = p.features.find((f) => f.key === "piscine")!;
    expect(pool.status).toBe("not_observable");
    expect(pool.value).toBeNull();
  });

  it("ABSENT n'est jamais déduit de l'absence de photo", () => {
    const facts = resolveFacts({ features: {}, ai: payload({ features: [] }) });
    const clim = facts.find((f) => f.key === "climatisation")!;
    expect(clim.status).toBe("unknown");
    expect(clim.value).toBeNull();
    expect(factsToFeatures({}, facts).climatisation).toBeUndefined();
  });

  it("une faiblesse sans justification est écartée, une faiblesse justifiée est conservée", () => {
    const p = payload({
      weaknesses: [
        { label: "Pas de climatisation" },
        { label: "Salle de bain datée", rationale: "Carrelage et robinetterie anciens visibles sur 2 photos" },
      ],
    });
    expect(p.weaknesses.map((w) => w.label)).toEqual(["Salle de bain datée"]);
  });

  it("les USP sont plafonnées à 7 et justifiées", () => {
    const p = payload({
      usp: Array.from({ length: 10 }, (_, i) => ({ label: `USP ${i}`, rationale: "observé" })),
    });
    expect(p.usp).toHaveLength(7);
  });
});

describe("hiérarchie des sources et conflits", () => {
  it("piscine privée détectée, saisie privée : pas de conflit", () => {
    const facts = resolveFacts({
      features: { piscine: "Piscine privée" },
      ai: payload({ features: [{ key: "piscine", value: "private", status: "present", confidence: 0.97 }] }),
    });
    const pool = facts.find((f) => f.key === "piscine")!;
    expect(pool.value).toBe("privee");
    expect(pool.source).toBe("USER");
    expect(pool.conflict).toBeNull();
  });

  it("piscine commune saisie vs privée détectée : conflit, la saisie gagne", () => {
    const facts = resolveFacts({
      features: { piscine: "Piscine commune" },
      ai: payload({ features: [{ key: "piscine", value: "piscine privée", status: "present", confidence: 0.9 }] }),
    });
    const pool = facts.find((f) => f.key === "piscine")!;
    expect(pool.value).toBe("commune");
    expect(pool.source).toBe("USER");
    expect(pool.conflict).not.toBeNull();
    expect(pool.conflict!.ai).toBe("privee");
  });

  it("absence de piscine confirmée par la saisie", () => {
    const facts = resolveFacts({ features: { piscine: "Pas de piscine" }, ai: payload({}) });
    const pool = facts.find((f) => f.key === "piscine")!;
    expect(pool.value).toBe("aucune");
    expect(pool.status).toBe("absent");
  });

  it("vue mer observée sans saisie : la valeur IA est retenue avec sa confiance", () => {
    const facts = resolveFacts({
      features: {},
      ai: payload({ features: [{ key: "vue", value: "vue mer panoramique", status: "present", confidence: 0.94 }] }),
    });
    const v = facts.find((f) => f.key === "vue")!;
    expect(v.value).toBe("panoramique");
    expect(v.source).toBe("AI");
    expect(confidenceBand(v.confidence)).toBe("HIGH");
  });

  it("absence de vue : vue déclarée aucune", () => {
    const facts = resolveFacts({ features: { vue: "Aucune vue particulière" }, ai: payload({}) });
    expect(facts.find((f) => f.key === "vue")!.value).toBe("aucune");
  });

  it("une correction manuelle écrase la donnée IA et la saisie", () => {
    const facts = resolveFacts({
      features: { chambres: 3 },
      ai: payload({ features: [{ key: "chambres", value: 2, status: "present", confidence: 0.6 }] }),
      overrides: { "fact.chambres": { value: 4 } },
    });
    const ch = facts.find((f) => f.key === "chambres")!;
    expect(ch.value).toBe(4);
    expect(ch.source).toBe("MANUAL");
    expect(ch.candidates.map((c) => c.source)).toContain("AI");
  });

  it("les caractéristiques résolues alimentent le moteur sans écraser la saisie", () => {
    const facts = resolveFacts({
      features: { piscine: "Piscine commune", chambres: 3 },
      ai: payload({
        features: [
          { key: "piscine", value: "privée", status: "present", confidence: 0.9 },
          { key: "parking", value: "garage", status: "present", confidence: 0.8 },
        ],
      }),
    });
    const f = factsToFeatures({ piscine: "Piscine commune", chambres: 3 }, facts);
    expect(f.piscine).toBe("Piscine commune");
    expect(f.parking).toBe("garage");
  });

  it("les scores IA sont transmis au moteur sous les clés attendues", () => {
    const p = payload({
      scores: {
        STANDING_SCORE: 82, PROPERTY_CONDITION_SCORE: 74, DESIGN_SCORE: 68,
        EQUIPMENT_QUALITY_SCORE: 61, VISUAL_APPEAL_SCORE: 79,
      },
    });
    expect(toEngineAiScores(p)).toEqual({
      standing: 82, etat: 74, design: 68, equipements: 61, qualite_percue: 79,
    });
  });
});

describe("qualité et sélection des photos", () => {
  const photos = [
    { id: "a", category: "salon", aesthetic: 90, technical: 88, importance: 95 },
    { id: "b", category: "chambre", aesthetic: 70, technical: 72, importance: 60 },
    { id: "c", category: "cave", aesthetic: 20, technical: 25, importance: 10 },
    { id: "d", category: "vue", aesthetic: 85, technical: 30, importance: 90 },
  ];

  it("les photos de mauvaise qualité sont exclues automatiquement", () => {
    const res = selectReportPhotos(photos);
    const byId = Object.fromEntries(res.map((r) => [r.id, r]));
    expect(byId.a.selected).toBe(true);
    expect(byId.c.selected).toBe(false);
    expect(byId.d.selected).toBe(false); // technique trop faible
  });

  it("la sélection manuelle prime toujours", () => {
    const res = selectReportPhotos(photos, { c: true, a: false });
    const byId = Object.fromEntries(res.map((r) => [r.id, r]));
    expect(byId.c.selected).toBe(true);
    expect(byId.c.manual).toBe(true);
    expect(byId.a.selected).toBe(false);
  });

  it("photos non analysées : ni retenues, ni jugées", () => {
    const res = selectReportPhotos([{ id: "x" }]);
    expect(res[0].selected).toBe(false);
    expect(res[0].score).toBeNull();
  });
});

describe("comparaison au marché", () => {
  const facts = (features: any, ai: any = {}) => resolveFacts({ features, ai: payload(ai) });

  it("un équipement répandu est identifié comme attendu", () => {
    const items = compareToMarket(facts({ climatisation: "Toutes les pièces" }), { climatisation: 73 });
    const c = items.find((i) => i.key === "climatisation")!;
    expect(c.verdict).toBe("standard_du_marche");
  });

  it("une piscine privée sur un marché peu équipé est différenciante", () => {
    const items = compareToMarket(facts({ piscine: "Piscine privée" }), { piscine: 40 });
    expect(items.find((i) => i.key === "piscine")!.verdict).toBe("differenciant");
  });

  it("un équipement absent sur un marché très équipé est un manque", () => {
    const items = compareToMarket(facts({ climatisation: "Aucune" }), { climatisation: 80 });
    expect(items.find((i) => i.key === "climatisation")!.verdict).toBe("manque");
  });

  it("une donnée non observable ne produit aucune conclusion", () => {
    const items = compareToMarket(
      facts({}, { features: [{ key: "climatisation", status: "not_observable", value: null, confidence: 0.1 }] }),
      { climatisation: 80 },
    );
    expect(items.find((i) => i.key === "climatisation")!.verdict).toBe("inconnu");
  });
});

describe("extraction RDNA", () => {
  const valid = {
    currency: "USD",
    market_score: { value: 78, page: 1 },
    projected_revenue: { value: 48500, page: 1 },
    occupancy_pct: { value: 62, page: 1 },
    adr: { value: 115.8, page: 1 },
    available_days: { value: 300, page: 2 },
    confidence: "HIGH",
    monthly_revenue: [{ month: "2025-07", value: { value: 8200, page: 2 } }],
    annual_revenue_history: [{ year: "2024", value: { value: 44100, page: 2 } }],
    comparables: [
      { titre: "Villa A", chambres: 3, sdb: 2, capacite: 6, adr: { value: 210 }, occupation_pct: 55, revenus: { value: 42000 }, amenities: ["pool", "ac"], page: 3 },
    ],
    amenity_penetration: { piscine: 40, climatisation: 73 },
  };

  it("PDF valide : valeurs, devise et page conservées telles quelles", () => {
    const ext = normalizeRdnaExtraction(valid, { file_name: "rdna.pdf" });
    expect(ext.adr).toEqual({ value: 115.8, currency: "USD", unit: null, source: "RDNA", page: 1 });
    expect(ext.occupancy_pct!.unit).toBe("%");
    expect(ext.comparables[0].adr!.currency).toBe("USD");
    expect(ext.comparables[0].equipements).toEqual(["pool", "ac"]);
    expect(ext.missing).toEqual([]);
    expect(ext.document.file_name).toBe("rdna.pdf");
  });

  it("PDF incomplet : les champs absents sont listés, jamais comblés", () => {
    const ext = normalizeRdnaExtraction({ currency: "USD", adr: { value: 100 } });
    expect(ext.projected_revenue).toBeNull();
    expect(ext.occupancy_pct).toBeNull();
    expect(ext.missing).toContain("projected_revenue");
    expect(ext.comparables).toEqual([]);
  });

  it("la conversion de devise est explicite et faite pour le moteur seulement", () => {
    const ext = normalizeRdnaExtraction(valid);
    const engine = rdnaToEngineData(ext, 0.92);
    expect(engine.adr_eur).toBe(106.54);
    expect(ext.adr!.value).toBe(115.8); // l'original n'a pas bougé
    expect(engine.conversion.usd_eur_rate).toBe(0.92);
  });
});

describe("échec de l'analyse et résumé", () => {
  it("analyse IA échouée : les erreurs sont conservées, rien n'est marqué comme complet", () => {
    const p = payload({}, meta(0, 4, ["Lot 1 : erreur IA 500"]));
    expect(p.errors).toHaveLength(1);
    expect(p.photos_failed).toBe(4);
    expect(p.global_confidence).toBeNull();
  });

  it("le résumé interne agrège forces, USP, cible et conflits", () => {
    const p = payload({
      scores: { STANDING_SCORE: 80 },
      positioning: { label: "Premium", confidence: 0.8 },
      strengths: [{ label: "Vue mer" }],
      usp: [{ label: "Terrasse avec vue mer", rationale: "visible sur 3 photos" }],
      target: { primary: "Couples", secondary: ["Familles"] },
      global_confidence: 0.8,
    });
    const facts = resolveFacts({
      features: { piscine: "Piscine commune" },
      ai: payload({ features: [{ key: "piscine", value: "privée", status: "present", confidence: 0.9 }] }),
    });
    const s = buildPropertySummary(p, facts);
    expect(s.positionnement).toBe("Premium");
    expect(s.usp).toEqual(["Terrasse avec vue mer"]);
    expect(s.clientele_cible.primary).toBe("Couples");
    expect(s.conflits).toHaveLength(1);
    expect(s.confiance).toBe("HIGH");
  });
});

describe("utilitaires", () => {
  it("reconnaît les valeurs inconnues", () => {
    expect(isUnknownValue("non observable")).toBe(true);
    expect(isUnknownValue("Inconnue")).toBe(true);
    expect(isUnknownValue("")).toBe(true);
    expect(isUnknownValue("Piscine privée")).toBe(false);
  });

  it("distingue piscine privée et commune, vue panoramique et partielle", () => {
    expect(normalizePool("Shared pool")).toBe("commune");
    expect(normalizePool("Private pool")).toBe("privee");
    expect(normalizeView("Partial sea view")).toBe("partielle");
    expect(normalizeView("Vue mer panoramique")).toBe("panoramique");
  });
});

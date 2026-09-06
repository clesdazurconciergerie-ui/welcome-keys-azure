// Extraction déterministe d'un rapport AirDNA / Rentalizer via Gemini.
// Entrée : PDF base64. Sortie : JSON strict (valeurs converties USD→EUR).
// Aucun chiffre n'est inventé : si Gemini ne trouve pas un champ, il renvoie null.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `Tu extrais des données structurées d'un rapport AirDNA / Rentalizer PDF.
RÈGLES ABSOLUES :
- Toutes les valeurs monétaires du PDF sont en USD.
- Tu renvoies uniquement du JSON valide qui respecte le schéma ci-dessous.
- Si une valeur est absente ou illisible → null. N'INVENTE JAMAIS.
- Les pourcentages sont des nombres 0-100 (pas 0-1).
- La liste "comparables" contient au plus 15 entrées.

SCHÉMA :
{
  "adresse": string | null,
  "chambres": number | null,
  "sdb": number | null,
  "voyageurs": number | null,
  "market_score": number | null,
  "adr_usd": number | null,
  "occupation_pct": number | null,
  "revenu_annuel_usd": number | null,
  "operating_expenses_usd": number | null,
  "net_operating_income_usd": number | null,
  "available_days": number | null,
  "confidence": string | null,
  "pages": number | null,
  "monthly_revenue_usd": [{ "month": string, "revenue_usd": number, "page": number|null }],
  "annual_revenue_history_usd": [{ "year": string, "revenue_usd": number, "page": number|null }],
  "amenity_penetration_pct": { "piscine": number|null, "climatisation": number|null, "parking": number|null, "vue": number|null, "lave_vaisselle": number|null, "lave_linge": number|null },
  "comparables": [{ "nom": string, "chambres": number|null, "sdb": number|null, "capacite": number|null, "adr_usd": number|null, "occupation_pct": number|null, "revenu_annuel_usd": number|null, "jours_disponibles": number|null, "localisation": string|null, "equipements": string[], "page": number|null }]
}

Indique la page du PDF (champ "page") chaque fois que tu peux la déterminer, sinon null.`;

interface ExtractedRaw {
  adresse: string | null;
  chambres: number | null;
  sdb: number | null;
  voyageurs: number | null;
  market_score: number | null;
  adr_usd: number | null;
  occupation_pct: number | null;
  revenu_annuel_usd: number | null;
  operating_expenses_usd: number | null;
  net_operating_income_usd: number | null;
  available_days: number | null;
  confidence: string | null;
  pages: number | null;
  monthly_revenue_usd: { month: string; revenue_usd: number; page?: number | null }[];
  annual_revenue_history_usd: { year: string; revenue_usd: number; page?: number | null }[];
  amenity_penetration_pct: Record<string, number | null> | null;
  comparables: {
    nom: string; chambres: number | null; sdb?: number | null; capacite?: number | null;
    adr_usd: number | null; occupation_pct: number | null; revenu_annuel_usd: number | null;
    jours_disponibles?: number | null; localisation?: string | null; equipements?: string[]; page?: number | null;
  }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const pdfBase64: string | undefined = body?.pdf_base64;
    const usdEurRate: number = typeof body?.usd_eur_rate === "number" ? body.usd_eur_rate : 0.92;
    const filename: string = body?.filename ?? "airdna.pdf";

    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return json({ error: "pdf_base64 required" }, 400);
    }
    // Strip prefix data:application/pdf;base64, if present
    const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, "");
    if (cleanBase64.length > 15_000_000) {
      return json({ error: "pdf too large (>10 MB base64)" }, 413);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const gemResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrais les données de ce rapport AirDNA au format JSON strict." },
              { type: "file", file: { filename, file_data: `data:application/pdf;base64,${cleanBase64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!gemResp.ok) {
      const err = await gemResp.text();
      console.error("Gemini error", gemResp.status, err);
      return json({ error: "gemini_failed", status: gemResp.status, detail: err.slice(0, 500) }, 502);
    }
    const gem = await gemResp.json();
    const raw: string = gem?.choices?.[0]?.message?.content ?? "";
    let extracted: ExtractedRaw;
    try {
      extracted = JSON.parse(raw);
    } catch {
      return json({ error: "invalid_json_from_model", raw: raw.slice(0, 500) }, 502);
    }

    // Conversion USD → EUR. Aucun arrondi excessif — on garde 2 décimales.
    const rate = usdEurRate;
    const toEur = (v: number | null | undefined) => v == null ? null : Math.round(v * rate);
    const out = {
      source: "airdna_rentalizer",
      usd_eur_rate: rate,
      extracted_at: new Date().toISOString(),
      adresse: extracted.adresse ?? null,
      chambres: extracted.chambres ?? null,
      sdb: extracted.sdb ?? null,
      voyageurs: extracted.voyageurs ?? null,
      market_score: extracted.market_score ?? null,
      adr_eur: toEur(extracted.adr_usd),
      occupation_pct: extracted.occupation_pct ?? null,
      revenu_annuel_eur: toEur(extracted.revenu_annuel_usd),
      operating_expenses_eur: toEur(extracted.operating_expenses_usd),
      net_operating_income_eur: toEur(extracted.net_operating_income_usd),
      monthly_revenue_eur: (extracted.monthly_revenue_usd ?? []).map((m) => ({
        month: m.month, revenue_eur: toEur(m.revenue_usd),
      })),
      comparables: (extracted.comparables ?? []).slice(0, 15).map((c) => ({
        nom: c.nom,
        chambres: c.chambres ?? null,
        adr_eur: toEur(c.adr_usd),
        occupation_pct: c.occupation_pct ?? null,
        revenu_annuel_eur: toEur(c.revenu_annuel_usd),
      })),
    };

    // §16 — extraction fidèle : valeur d'origine, devise, unité, source et page.
    // Aucune conversion ici : le moteur convertira explicitement s'il en a besoin.
    const val = (v: number | null | undefined, currency: string | null, unit: string | null, page: number | null = null) =>
      v == null ? null : { value: v, currency, unit, source: "RDNA", page };

    const penetration: Record<string, number> = {};
    for (const [k, v] of Object.entries(extracted.amenity_penetration_pct ?? {})) {
      if (typeof v === "number" && Number.isFinite(v)) penetration[k] = v;
    }

    const raw_extraction = {
      currency: "USD",
      pages: extracted.pages ?? null,
      confidence: extracted.confidence ?? null,
      market_score: val(extracted.market_score, null, "/100"),
      projected_revenue: val(extracted.revenu_annuel_usd, "USD", "an"),
      occupancy_pct: val(extracted.occupation_pct, null, "%"),
      adr: val(extracted.adr_usd, "USD", "nuit"),
      available_days: val(extracted.available_days, null, "jours"),
      operating_expenses: val(extracted.operating_expenses_usd, "USD", "an"),
      net_operating_income: val(extracted.net_operating_income_usd, "USD", "an"),
      monthly_revenue: (extracted.monthly_revenue_usd ?? []).map((m) => ({
        month: m.month, value: val(m.revenue_usd, "USD", "mois", m.page ?? null),
      })),
      annual_revenue_history: (extracted.annual_revenue_history_usd ?? []).map((y) => ({
        year: y.year, value: val(y.revenue_usd, "USD", "an", y.page ?? null),
      })),
      amenity_penetration: penetration,
      comparables: (extracted.comparables ?? []).slice(0, 15).map((c) => ({
        titre: c.nom ?? null,
        chambres: c.chambres ?? null,
        sdb: c.sdb ?? null,
        capacite: c.capacite ?? null,
        revenus: val(c.revenu_annuel_usd, "USD", "an", c.page ?? null),
        jours_disponibles: c.jours_disponibles ?? null,
        occupation_pct: c.occupation_pct ?? null,
        adr: val(c.adr_usd, "USD", "nuit", c.page ?? null),
        localisation: c.localisation ?? null,
        equipements: c.equipements ?? [],
        page: c.page ?? null,
      })),
      extra: { adresse: extracted.adresse ?? null, chambres: extracted.chambres ?? null, sdb: extracted.sdb ?? null, voyageurs: extracted.voyageurs ?? null },
    };

    return json({ ...out, raw_extraction, filename }, 200);
  } catch (e) {
    console.error("parse-airdna-pdf error", e);
    return json({ error: "unexpected", message: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

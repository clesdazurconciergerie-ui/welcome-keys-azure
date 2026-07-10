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
  "monthly_revenue_usd": [{ "month": string, "revenue_usd": number }],
  "comparables": [{ "nom": string, "chambres": number|null, "adr_usd": number|null, "occupation_pct": number|null, "revenu_annuel_usd": number|null }]
}`;

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
  monthly_revenue_usd: { month: string; revenue_usd: number }[];
  comparables: { nom: string; chambres: number | null; adr_usd: number | null; occupation_pct: number | null; revenu_annuel_usd: number | null }[];
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

    return json(out, 200);
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

// MODULE — Estimation locative · ANALYSE IA DU LOGEMENT (étape 3)
// ─────────────────────────────────────────────────────────────────────────────
// L'IA observe, elle ne fixe jamais le prix : cette fonction renvoie des
// observations structurées que le client normalise (src/lib/estimation-locative/
// ai-analysis.ts) avant de les transmettre au moteur de calcul (étape 2).
//
// Règles : les photos sont analysées par lots (§26), un lot en échec n'annule pas
// les autres (§27), et une caractéristique non visible reste "not_observable" (§3).
// La clé IA reste côté serveur (§28).
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-3.7-flash";
const BATCH_SIZE = 6;
const MAX_PHOTOS = 24;

const RULES = `RÈGLES ABSOLUES :
- Tu n'inventes JAMAIS. Une caractéristique non visible n'est PAS absente.
- status possibles : "present" (clairement visible), "absent" (visiblement absent, ex. un mur nu là où une clim serait attendue n'est PAS une preuve), "not_observable" (aucune photo ne permet de conclure).
- Le type compte : piscine privée ≠ piscine commune, vue panoramique ≠ vue partielle, parking privé ≠ stationnement dans la rue.
- confidence est un nombre entre 0 et 1 qui reflète la visibilité réelle de l'information.
- Les notes sont des entiers de 0 à 100.
- Tu réponds UNIQUEMENT en JSON valide, sans markdown, en français.`;

const BATCH_SCHEMA = `{
  "photo_scores": [{ "photo_id": string, "category": string|null, "aesthetic": number, "technical": number, "importance": number, "usable": boolean, "note": string|null }],
  "rooms_seen": string[],
  "features": [{ "key": string, "value": string|number|null, "status": "present"|"absent"|"not_observable", "confidence": number, "rationale": string }],
  "observations": string[],
  "premium_elements": string[],
  "aging_elements": string[],
  "partial_scores": { "standing": number|null, "condition": number|null, "design": number|null, "equipment": number|null, "visual_appeal": number|null, "luminosite": number|null, "cadrage": number|null, "nettete": number|null }
}`;

const FINAL_SCHEMA = `{
  "scores": { "STANDING_SCORE": number|null, "PROPERTY_CONDITION_SCORE": number|null, "DESIGN_SCORE": number|null, "EQUIPMENT_QUALITY_SCORE": number|null, "VISUAL_APPEAL_SCORE": number|null, "PHOTO_QUALITY_SCORE": number|null, "PHOTO_COVERAGE_SCORE": number|null },
  "photo_quality": { "luminosite": number|null, "cadrage": number|null, "nettete": number|null, "coherence": number|null, "couverture_pieces": string[], "pieces_manquantes": string[] },
  "features": [{ "key": string, "value": string|number|null, "status": "present"|"absent"|"not_observable", "confidence": number, "rationale": string }],
  "strengths": [{ "label": string, "rationale": string }],
  "weaknesses": [{ "label": string, "rationale": string }],
  "usp": [{ "label": string, "rationale": string }],
  "recommendations": [{ "label": string, "priority": "LOW"|"MEDIUM"|"HIGH", "rationale": string, "impact": string }],
  "positioning": { "label": "Entrée de marché"|"Standard"|"Supérieur"|"Premium"|"Très premium", "confidence": number, "rationale": string },
  "target": { "primary": string, "secondary": string[], "rationale": string },
  "summary": { "positionnement": string|null, "standing": string|null, "potentiel_locatif": string|null, "points_a_ameliorer": string[], "risques": string[] },
  "global_confidence": number
}`;

const FINAL_RULES = `${RULES}
- Les clés de "features" sont normalisées : chambres, salles_de_bain, couchages, surface_interieure_m2, piscine, parking, vue, climatisation, exterieurs, wifi, type.
- 3 à 7 USP maximum, chacune appuyée sur une observation réelle.
- Aucune faiblesse sans justification issue des observations.
- Les recommandations n'annoncent JAMAIS de gain financier chiffré : parler de "potentiel d'amélioration du positionnement" ou "susceptible d'améliorer l'attractivité".
- Les distances ne sont utilisées que si elles figurent dans les données fournies.
- Le positionnement est un signal descriptif : il ne fixe aucun prix.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const estimationId: string | undefined = body?.estimation_id;
    const photos: { id: string; url: string; category?: string | null }[] =
      Array.isArray(body?.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];
    const context = body?.context ?? {};

    if (!estimationId) return json({ error: "estimation_id requis" }, 400);
    if (photos.length === 0) return json({ error: "Ajoute au moins une photo avant de lancer l'analyse." }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Configuration IA manquante côté serveur." }, 500);

    /* ── 1. Analyse par lots ─────────────────────────────────────────────── */
    const batches: typeof photos[] = [];
    for (let i = 0; i < photos.length; i += BATCH_SIZE) batches.push(photos.slice(i, i + BATCH_SIZE));

    const batchResults: any[] = [];
    const errors: string[] = [];
    let analyzed = 0;
    let failed = 0;

    for (const [index, batch] of batches.entries()) {
      const content: unknown[] = [
        {
          type: "text",
          text: `Analyse ces ${batch.length} photos d'un logement de location courte durée.
Identifiants des photos, dans l'ordre : ${batch.map((p) => p.id).join(", ")}.
Renvoie ce JSON : ${BATCH_SCHEMA}`,
        },
        ...batch.map((p) => ({ type: "image_url", image_url: { url: p.url } })),
      ];

      const res = await callAi(key, [
        { role: "system", content: RULES },
        { role: "user", content },
      ]);

      if (!res.ok) {
        failed += batch.length;
        errors.push(`Lot ${index + 1} (${batch.length} photos) : ${res.error}`);
        if (res.status === 429 || res.status === 402) break; // inutile d'insister
        continue;
      }
      analyzed += batch.length;
      batchResults.push(res.data);
    }

    if (!batchResults.length) {
      const first = errors[0] ?? "Analyse impossible";
      const status = first.includes("429") ? 429 : first.includes("402") ? 402 : 502;
      return json({ error: `L'analyse des photos a échoué. ${first}`, errors }, status);
    }

    /* ── 2. Consolidation ────────────────────────────────────────────────── */
    const consolidationInput = {
      photos_analysees: analyzed,
      photos_non_analysees: failed,
      lots: batchResults,
      donnees_saisies: context.features ?? {},
      localisation: context.location ?? {},
      adresse: context.address ?? null,
      ville: context.city ?? null,
      type_de_bien: context.property_type ?? null,
      taux_equipement_marche_rdna: context.amenity_penetration ?? {},
    };

    const finalRes = await callAi(key, [
      { role: "system", content: FINAL_RULES },
      {
        role: "user",
        content: `Consolide ces analyses partielles en une analyse unique du logement.
Données disponibles (JSON) :
${JSON.stringify(consolidationInput).slice(0, 60000)}

Renvoie ce JSON : ${FINAL_SCHEMA}`,
      },
    ]);

    if (!finalRes.ok) {
      return json({
        error: `La consolidation de l'analyse a échoué. ${finalRes.error}`,
        errors: [...errors, finalRes.error],
        partial: { photo_scores: batchResults.flatMap((b) => b?.photo_scores ?? []) },
      }, finalRes.status === 429 ? 429 : finalRes.status === 402 ? 402 : 502);
    }

    const raw = finalRes.data ?? {};
    // Les scores par photo viennent des lots (l'étape de consolidation ne les revoit pas).
    raw.photo_scores = batchResults.flatMap((b) => b?.photo_scores ?? []);

    return json({
      success: true,
      raw,
      photos_analyzed: analyzed,
      photos_failed: failed,
      errors,
      model: MODEL,
    });
  } catch (err) {
    console.error("estimation-analyze-photos", (err as Error).message);
    return json({ error: "Erreur inattendue pendant l'analyse." }, 500);
  }
});

async function callAi(key: string, messages: unknown[]): Promise<
  { ok: true; data: any } | { ok: false; status: number; error: string }
> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, response_format: { type: "json_object" } }),
    });

    if (resp.status === 429) return { ok: false, status: 429, error: "429 — limite IA atteinte, réessaie dans un instant." };
    if (resp.status === 402) return { ok: false, status: 402, error: "402 — crédits IA épuisés." };
    if (!resp.ok) {
      const t = await resp.text();
      console.error("gateway error", resp.status, t.slice(0, 300));
      return { ok: false, status: resp.status, error: `Erreur IA ${resp.status}` };
    }
    const payload = await resp.json();
    let content = payload?.choices?.[0]?.message?.content ?? "";
    content = String(content).replace(/```json\s*/g, "").replace(/```/g, "").trim();
    try {
      return { ok: true, data: JSON.parse(content) };
    } catch {
      return { ok: false, status: 502, error: "Réponse IA illisible." };
    }
  } catch (e) {
    console.error("gateway fetch failed", (e as Error).message);
    return { ok: false, status: 502, error: "Service IA injoignable." };
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

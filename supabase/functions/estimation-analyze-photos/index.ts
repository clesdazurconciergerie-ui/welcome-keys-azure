// MODULE — Estimation locative : analyse IA des photos d'un logement.
// Renvoie des données structurées. AUCUNE valeur inventée : null si non visible.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `Tu es un expert en location courte durée haut de gamme sur la Côte d'Azur.
Tu analyses des photos d'un logement et tu renvoies UNIQUEMENT du JSON valide.
RÈGLES : n'invente jamais. Si un élément n'est pas visible sur les photos → null ou liste vide.
Les notes sont des entiers de 0 à 100.

SCHÉMA :
{
  "qualite_generale": number|null, "etat": number|null, "standing": number|null,
  "mobilier": number|null, "decoration": number|null, "style": string|null,
  "modernite": number|null, "cuisine": number|null, "salles_de_bain": number|null,
  "literie": number|null, "luminosite": number|null, "exterieurs": number|null,
  "vue": number|null, "equipements_percus": string[],
  "potentiel_esthetique": number|null, "potentiel_instagram": number|null,
  "points_forts": string[], "points_faibles": string[], "elements_vieillissants": string[],
  "facteurs_baissiers": string[], "facteurs_haussiers": string[],
  "caracteristiques_detectees": [{"cle": string, "valeur": string}],
  "scores": {"standing":number|null,"etat":number|null,"design":number|null,"equipements":number|null,"exterieurs":number|null,"vue":number|null,"qualite_percue":number|null}
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const estimationId: string | undefined = body?.estimation_id;
    const imageUrls: string[] = Array.isArray(body?.image_urls) ? body.image_urls.slice(0, 12) : [];
    if (!estimationId || imageUrls.length === 0) {
      return json({ error: "estimation_id et image_urls requis" }, 400);
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "LOVABLE_API_KEY manquante" }, 500);

    const content: unknown[] = [
      { type: "text", text: "Analyse ces photos du logement et renvoie le JSON du schéma, sans markdown." },
      ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
      }),
    });

    if (resp.status === 429) return json({ error: "Limite IA atteinte, réessaie dans un instant." }, 429);
    if (resp.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!resp.ok) {
      const txt = await resp.text();
      return json({ error: `Erreur IA ${resp.status}: ${txt.slice(0, 200)}` }, 500);
    }

    const aiJson = await resp.json();
    let raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    raw = String(raw).replace(/```json\s*/g, "").replace(/```/g, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "Réponse IA illisible", raw: raw.slice(0, 400) }, 500);
    }

    const scores = (parsed.scores ?? {}) as Record<string, number | null>;
    delete (parsed as Record<string, unknown>).scores;

    const { error } = await supabase
      .from("estim_estimations")
      .update({ ai_analysis: parsed, ai_scores: scores, status: "analyzed" })
      .eq("id", estimationId);
    if (error) return json({ error: error.message }, 500);

    return json({ success: true, analysis: parsed, scores });
  } catch (err) {
    console.error("estimation-analyze-photos", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

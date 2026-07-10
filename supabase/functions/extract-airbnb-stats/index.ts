import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const METRIC_KEYS = [
  "impressions",
  "vues",
  "taux_clic",
  "taux_conversion",
  "reservations",
  "revenus",
  "nuits_reservees",
  "taux_occupation",
  "prix_moyen_nuit",
  "annulations",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { paths } = await req.json() as { paths: string[] };
    if (!Array.isArray(paths) || paths.length === 0) {
      return new Response(JSON.stringify({ error: "No screenshots provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign URLs via service role so the vision model can fetch them
    const signedUrls: string[] = [];
    for (const p of paths) {
      const { data, error } = await admin.storage
        .from("airbnb-screenshots")
        .createSignedUrl(p, 60 * 30);
      if (error || !data) throw new Error(`Signing failed for ${p}: ${error?.message}`);
      signedUrls.push(data.signedUrl);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Tu es un extracteur strict de statistiques Airbnb. Tu analyses des captures d'écran du dashboard Airbnb (Statistiques, Réservations, Performances).
RÈGLE ABSOLUE : n'invente JAMAIS un chiffre. Si une valeur n'est pas visible sur les images, retourne \`null\` pour \`value\` et \`0\` pour \`confidence\`.
Pour chaque métrique visible, donne la valeur numérique brute (sans unité, sans %) et un score de confiance entre 0 et 1.
Réponds via l'outil \`extract_airbnb_metrics\`.`;

    const userContent: any[] = [
      { type: "text", text: "Extrais les métriques visibles dans ces captures d'écran Airbnb. Retourne null pour toute valeur non visible." },
      ...signedUrls.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const tools = [{
      type: "function",
      function: {
        name: "extract_airbnb_metrics",
        description: "Retourne les métriques Airbnb extraites avec un score de confiance",
        parameters: {
          type: "object",
          properties: Object.fromEntries(
            METRIC_KEYS.map((k) => [k, {
              type: "object",
              properties: {
                value: { type: ["number", "null"] },
                confidence: { type: "number" },
                unit: { type: ["string", "null"] },
              },
              required: ["value", "confidence"],
            }]),
          ),
          required: [...METRIC_KEYS],
        },
      },
    }];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_airbnb_metrics" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits AI épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + errText);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: Record<string, { value: number | null; confidence: number }> = {};
    if (toolCall?.function?.arguments) {
      extracted = JSON.parse(toolCall.function.arguments);
    } else {
      // no extraction returned — all null
      for (const k of METRIC_KEYS) extracted[k] = { value: null, confidence: 0 };
    }

    // Ensure every key present
    for (const k of METRIC_KEYS) {
      if (!extracted[k]) extracted[k] = { value: null, confidence: 0 };
    }

    return new Response(JSON.stringify({ success: true, metrics: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-airbnb-stats error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

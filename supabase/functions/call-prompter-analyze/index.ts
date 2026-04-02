import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, settings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const transcriptText = transcript
      .map((e: any) => `[${e.speaker === "user" ? "Vous" : "Prospect"}] ${e.text}`)
      .join("\n");

    const systemPrompt = `Tu es un analyste de vente expert en conciergeries immobilières.

Analyse cette conversation téléphonique et génère un rapport structuré en JSON avec exactement ces champs :
{
  "summary": "Résumé concis de la conversation",
  "key_moments": ["Moment clé 1", "Moment clé 2"],
  "objections": ["Objection détectée 1", "Objection 2"],
  "interest_level": "low|medium|high|very_high",
  "conversion_probability": 0-100,
  "strengths": ["Ce que l'utilisateur a bien fait"],
  "improvements": ["Ce qui pourrait être amélioré"],
  "better_responses": [{"original": "Ce qui a été dit", "suggested": "Meilleure alternative"}],
  "patterns_detected": ["Schéma récurrent 1", "Schéma 2"],
  "skill_recommendations": ["Recommendation de skill à ajouter ou modifier"],
  "failed_strategies": ["Stratégie qui n'a pas marché"],
  "successful_techniques": ["Technique qui a fonctionné"]
}

ANALYSE APPROFONDIE :
- Identifier les objections récurrentes et les techniques qui ont échoué
- Détecter les moments où l'utilisateur a parlé trop longtemps
- Repérer les signaux d'achat manqués
- Proposer des réponses plus courtes et percutantes
- Évaluer si le closing a été tenté au bon moment

Contexte : ${settings?.company_name || "Conciergerie"}, zone ${settings?.geographic_area || "non précisée"}.
Réponds UNIQUEMENT avec le JSON, sans markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Voici la transcription complète :\n\n${transcriptText}` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    let analysisText = data.choices?.[0]?.message?.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      analysis = { summary: analysisText, key_moments: [], objections: [], interest_level: "medium", conversion_probability: 50, strengths: [], improvements: [], better_responses: [], patterns_detected: [], skill_recommendations: [], failed_strategies: [], successful_techniques: [] };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("call-prompter-analyze error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

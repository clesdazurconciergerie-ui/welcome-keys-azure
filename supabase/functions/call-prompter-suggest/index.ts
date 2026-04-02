import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prospect_speech, conversation_history, settings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Tu es un coach de vente d'élite spécialisé dans les conciergeries immobilières et la location saisonnière.

RÔLE : Générer la MEILLEURE réponse possible que l'utilisateur doit dire au prospect, en temps réel.

RÈGLES :
- Phrases naturelles, fluides, humaines — jamais robotiques
- Optimisées pour la persuasion et la conversion
- Réponses courtes si le prospect pose une question simple
- Réponses plus développées pour traiter les objections
- Toujours orienter vers la prise de rendez-vous ou la signature
- Adapter le ton selon le contexte (cold call vs closing)

CONTEXTE UTILISATEUR :
- Entreprise : ${settings?.company_name || "Conciergerie"}
- Services : ${settings?.services_offered || "Gestion locative saisonnière"}
- Commission : ${settings?.commission_rate || "Non précisé"}
- Zone géographique : ${settings?.geographic_area || "Non précisé"}
- Arguments clés : ${settings?.selling_points || "Revenus optimisés, gestion complète"}
- Client cible : ${settings?.target_client || "Propriétaires de biens saisonniers"}
- Ton : ${settings?.tone === "friendly" ? "Amical et chaleureux" : settings?.tone === "direct" ? "Direct et professionnel" : "Premium et expert"}

INSTRUCTIONS :
- Réponds UNIQUEMENT avec la phrase que l'utilisateur doit dire. Pas d'explication.
- Une seule réponse, prête à être lue à voix haute.`;

    const messages = [
      { role: "system", content: systemPrompt },
    ];

    if (conversation_history && conversation_history.length > 0) {
      for (const entry of conversation_history.slice(-10)) {
        messages.push({
          role: entry.speaker === "user" ? "assistant" : "user",
          content: entry.text,
        });
      }
    }

    messages.push({ role: "user", content: `Le prospect vient de dire : "${prospect_speech}"\n\nQuelle est la meilleure réponse à donner maintenant ?` });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("call-prompter-suggest error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

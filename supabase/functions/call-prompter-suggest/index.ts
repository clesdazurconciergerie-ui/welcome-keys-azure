import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prospect_speech, conversation_history, settings, past_analyses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build adaptive learning context from past analyses
    let learningContext = "";
    if (past_analyses && past_analyses.length > 0) {
      const commonObjections = past_analyses
        .flatMap((a: any) => a.objections || [])
        .filter(Boolean);
      const failedApproaches = past_analyses
        .flatMap((a: any) => (a.better_responses || []).map((r: any) => r.original))
        .filter(Boolean);
      const successfulApproaches = past_analyses
        .filter((a: any) => a.conversion_probability >= 60)
        .flatMap((a: any) => a.strengths || [])
        .filter(Boolean);

      if (commonObjections.length > 0) {
        learningContext += `\nOBJECTIONS FRÉQUENTES (prépare des réponses percutantes) :\n- ${[...new Set(commonObjections)].slice(0, 5).join("\n- ")}`;
      }
      if (failedApproaches.length > 0) {
        learningContext += `\nAPPROCHES À ÉVITER (ont échoué dans le passé) :\n- ${[...new Set(failedApproaches)].slice(0, 3).join("\n- ")}`;
      }
      if (successfulApproaches.length > 0) {
        learningContext += `\nAPPROCHES GAGNANTES (ont fonctionné) :\n- ${[...new Set(successfulApproaches)].slice(0, 3).join("\n- ")}`;
      }
    }

    const systemPrompt = `Tu es un closer d'élite spécialisé dans les conciergeries immobilières et la location saisonnière haut de gamme.

RÔLE : Générer la MEILLEURE réponse possible que l'utilisateur doit dire au prospect, en temps réel.

STYLE DE RÉPONSE :
- Ultra court et percutant (1-2 phrases max)
- Direct, pas de blabla
- Focus sur la douleur du prospect et la valeur différenciante
- Orientation systématique vers le closing (RDV ou signature)
- Ton de closer confiant, jamais défensif

TECHNIQUES DE CLOSING :
- Inversion de l'objection ("Justement, c'est pour ça que…")
- Urgence ("Les propriétaires qui hésitent perdent X€ par mois")
- Preuve sociale ("Nos 15 propriétaires sur la zone font en moyenne…")
- Question de closing ("On se voit jeudi ou vendredi ?")

CONTEXTE UTILISATEUR :
- Entreprise : ${settings?.company_name || "Conciergerie"}
- Services : ${settings?.services_offered || "Gestion locative saisonnière"}
- Commission : ${settings?.commission_rate || "Non précisé"}
- Zone : ${settings?.geographic_area || "Non précisé"}
- Arguments : ${settings?.selling_points || "Revenus optimisés, gestion complète"}
- Cible : ${settings?.target_client || "Propriétaires de biens saisonniers"}
- Ton : ${settings?.tone === "friendly" ? "Amical et chaleureux" : settings?.tone === "direct" ? "Direct et professionnel" : "Premium et expert"}
${learningContext}

INSTRUCTIONS :
- Réponds UNIQUEMENT avec la phrase que l'utilisateur doit dire. Pas d'explication.
- Une seule réponse, prête à être lue à voix haute.
- Sois BRUTAL en efficacité — chaque mot doit servir la conversion.`;

    const messages: any[] = [
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

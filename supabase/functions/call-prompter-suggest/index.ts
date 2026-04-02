import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fallback core prompt if no skills are loaded
const FALLBACK_CORE = `Tu es un closer d'élite spécialisé dans la gestion locative courte durée. Tu assistes en temps réel lors d'appels commerciaux.
FORMAT : 1-2 phrases MAX, naturelles, prêtes à dire à voix haute. Terminer par une question si possible.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prospect_speech, conversation_history, settings, past_analyses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Load user skills and script from DB
    let skillsPrompt = "";
    let scriptPrompt = "";

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get user from JWT
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          // Load active skills sorted by priority (high first) then order_index
          const { data: skills } = await supabase
            .from("call_prompter_skills")
            .select("name, prompt_content, priority")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("order_index", { ascending: true });

          if (skills && skills.length > 0) {
            // Sort: high > medium > low
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            const sorted = [...skills].sort((a, b) =>
              (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
              (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
            );

            skillsPrompt = sorted.map((s: any) =>
              `═══ SKILL [${s.priority.toUpperCase()}] : ${s.name} ═══\n${s.prompt_content}`
            ).join("\n\n");
          }

          // Load custom script
          const { data: scriptData } = await supabase
            .from("call_prompter_scripts")
            .select("pitch, key_phrases, unique_selling_points")
            .eq("user_id", user.id)
            .maybeSingle();

          if (scriptData) {
            const parts: string[] = [];
            if (scriptData.pitch) parts.push(`PITCH : ${scriptData.pitch}`);
            if (scriptData.key_phrases) parts.push(`PHRASES CLÉS : ${scriptData.key_phrases}`);
            if (scriptData.unique_selling_points) parts.push(`ARGUMENTS DIFFÉRENCIANTS : ${scriptData.unique_selling_points}`);
            if (parts.length > 0) {
              scriptPrompt = `\n═══ SCRIPT PERSONNALISÉ (toujours utiliser) ═══\n${parts.join("\n")}`;
            }
          }
        }
      }
    }

    // Build adaptive learning context from past analyses
    let learningContext = "";
    if (past_analyses && past_analyses.length > 0) {
      const commonObjections = past_analyses
        .flatMap((a: any) => a.objections || [])
        .filter(Boolean);
      const successfulApproaches = past_analyses
        .filter((a: any) => a.conversion_probability >= 60)
        .flatMap((a: any) => a.strengths || [])
        .filter(Boolean);
      const failedPatterns = past_analyses
        .filter((a: any) => a.conversion_probability < 30)
        .flatMap((a: any) => a.improvements || [])
        .filter(Boolean);

      if (commonObjections.length > 0) {
        learningContext += `\nOBJECTIONS FRÉQUENTES :\n- ${[...new Set(commonObjections)].slice(0, 5).join("\n- ")}`;
      }
      if (successfulApproaches.length > 0) {
        learningContext += `\nAPPROCHES QUI MARCHENT :\n- ${[...new Set(successfulApproaches)].slice(0, 3).join("\n- ")}`;
      }
      if (failedPatterns.length > 0) {
        learningContext += `\nÀ ÉVITER (échecs passés) :\n- ${[...new Set(failedPatterns)].slice(0, 3).join("\n- ")}`;
      }
    }

    const systemPrompt = `${skillsPrompt || FALLBACK_CORE}
${scriptPrompt}

CONTEXTE DE L'UTILISATEUR :
- Entreprise : ${settings?.company_name || "Conciergerie"}
- Services : ${settings?.services_offered || "Gestion locative saisonnière"}
- Commission : ${settings?.commission_rate || "~20%"}
- Zone : ${settings?.geographic_area || "Non précisé"}
- Arguments : ${settings?.selling_points || "Revenus optimisés, gestion complète"}
- Cible : ${settings?.target_client || "Propriétaires de biens saisonniers"}
- Ton : ${settings?.tone === "friendly" ? "Amical et chaleureux" : settings?.tone === "direct" ? "Direct et professionnel" : "Premium et expert"}
${learningContext}

INSTRUCTION FINALE :
Réponds UNIQUEMENT avec la phrase que l'utilisateur doit dire au prospect.
Pas d'explication. Pas de commentaire. Pas de formatage.
1-2 phrases max, prête à être lue à voix haute.
Chaque mot doit servir la conversion.`;

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

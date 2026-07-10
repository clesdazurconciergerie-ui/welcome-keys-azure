import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const body = await req.json() as {
      property: { nom: string; ville: string; slug: string };
      period_label: string;
      kpi: Record<string, { value: number | null; confidence?: number; source?: string }>;
      manual: {
        commentaires_voyageurs?: string;
        actions_conciergerie?: string;
        objectif_type?: "revenus" | "occupation" | null;
        objectif_valeur?: number | null;
      };
      previous?: {
        period_label: string;
        kpi: Record<string, { value: number | null }>;
      } | null;
    };

    // Keep only KPI with a real value for the AI (rule: never invent)
    const availableKpi: Record<string, number> = {};
    const missingKpi: string[] = [];
    for (const [k, v] of Object.entries(body.kpi)) {
      if (v?.value !== null && v?.value !== undefined && !Number.isNaN(v.value)) {
        availableKpi[k] = v.value as number;
      } else {
        missingKpi.push(k);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Tu es l'analyste de conciergerie premium Azurkeys Properties. Tu rédiges un rapport mensuel de performance Airbnb destiné à un PROPRIÉTAIRE non expert.

TON : professionnel, clair, rassurant, valorisant sans mentir. Pas de jargon technique inutile.
RÈGLES ABSOLUES :
- Ne JAMAIS inventer un chiffre. Utilise UNIQUEMENT les données fournies.
- Si une donnée est manquante, signale-le explicitement (ex : "donnée non disponible ce mois").
- Ne compare avec le mois précédent QUE si les chiffres du mois précédent sont fournis.
- Valorise le travail de la conciergerie honnêtement.
- Français impeccable. Phrases courtes. Zéro emoji.

Tu retournes ta réponse via l'outil \`generate_report_sections\`.`;

    const userPrompt = `Logement : ${body.property.nom} (${body.property.ville})
Période analysée : ${body.period_label}

DONNÉES DISPONIBLES (à utiliser telles quelles) :
${JSON.stringify(availableKpi, null, 2)}

DONNÉES MANQUANTES (à mentionner comme non disponibles) :
${missingKpi.join(", ") || "aucune"}

CONTEXTE MANUEL :
- Commentaires voyageurs marquants : ${body.manual.commentaires_voyageurs || "non fourni"}
- Actions réalisées par la conciergerie : ${body.manual.actions_conciergerie || "non fourni"}
- Objectif du mois : ${body.manual.objectif_type ? `${body.manual.objectif_valeur} (${body.manual.objectif_type})` : "non défini"}

RAPPORT PRÉCÉDENT :
${body.previous ? `Période : ${body.previous.period_label}\n${JSON.stringify(body.previous.kpi, null, 2)}` : "aucun rapport antérieur — ne fais AUCUNE comparaison mois précédent."}

Génère les 8 sections du rapport (couverture non incluse).`;

    const tools = [{
      type: "function",
      function: {
        name: "generate_report_sections",
        description: "Retourne les 8 sections rédigées du rapport mensuel",
        parameters: {
          type: "object",
          properties: {
            resume_executif: { type: "string", description: "3-5 phrases : performance globale, chiffre clé, tendance, conclusion simple." },
            kpi_commentaire: { type: "string", description: "Court commentaire général sur les KPI (2-4 phrases)." },
            tunnel_conversion: { type: "string", description: "Analyse impressions → vues → réservations + point de blocage identifié." },
            analyse_commerciale: { type: "string", description: "Revenus, prix moyen, périodes fortes/faibles, comparaison objectif/mois précédent SI données fournies." },
            diagnostic: {
              type: "object",
              properties: {
                fonctionne: { type: "array", items: { type: "string" } },
                bloque: { type: "array", items: { type: "string" } },
                risques: { type: "array", items: { type: "string" } },
                opportunites: { type: "array", items: { type: "string" } },
              },
              required: ["fonctionne", "bloque", "risques", "opportunites"],
            },
            recommandations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categorie: { type: "string", description: "prix, photos, titre, description, calendrier, durée min, promotions, avis" },
                  texte: { type: "string" },
                },
                required: ["categorie", "texte"],
              },
            },
            plan_action: {
              type: "array",
              description: "3 à 5 actions concrètes pour le mois prochain",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priorite: { type: "string", enum: ["haute", "moyenne", "basse"] },
                  impact_attendu: { type: "string" },
                },
                required: ["action", "priorite", "impact_attendu"],
              },
            },
            conclusion_proprietaire: { type: "string", description: "Texte clair, rassurant, non technique." },
          },
          required: ["resume_executif", "kpi_commentaire", "tunnel_conversion", "analyse_commerciale", "diagnostic", "recommandations", "plan_action", "conclusion_proprietaire"],
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
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "generate_report_sections" } },
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
    if (!toolCall?.function?.arguments) {
      throw new Error("Aucune sortie structurée de l'IA");
    }
    const sections = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, sections }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-airbnb-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

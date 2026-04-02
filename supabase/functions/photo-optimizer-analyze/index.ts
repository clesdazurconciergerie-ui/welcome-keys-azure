import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional real estate photography analyst specialized in Airbnb listings. Analyze the provided property photo and return a structured assessment.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this property photo for Airbnb listing optimization." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "photo_analysis",
              description: "Return structured photo analysis",
              parameters: {
                type: "object",
                properties: {
                  roomType: { type: "string", description: "Type of room (bedroom, living room, kitchen, bathroom, exterior, etc.)" },
                  lightingQuality: { type: "string", enum: ["Excellent", "Bon", "Moyen", "Faible", "Très faible"] },
                  composition: { type: "string", enum: ["Professionnelle", "Bonne", "Moyenne", "À améliorer"] },
                  issues: { type: "array", items: { type: "string" }, description: "List of issues detected (dark, cluttered, bad angle, etc.)" },
                  colorImprovements: { type: "array", items: { type: "string" }, description: "Suggested color improvements" },
                  realismCorrections: { type: "array", items: { type: "string" }, description: "Corrections to improve realism" },
                  stagingSuggestions: { type: "array", items: { type: "string" }, description: "Virtual staging suggestions (add decor, enhance ambiance, etc.)" },
                  overallScore: { type: "number", description: "Overall photo quality score 0-100" },
                },
                required: ["roomType", "lightingQuality", "composition", "issues", "colorImprovements", "realismCorrections", "stagingSuggestions", "overallScore"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "photo_analysis" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits épuisés. Ajoutez des fonds dans Paramètres > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("photo-optimizer-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

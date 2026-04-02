import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  standard: "Clean, bright, professional real estate photography style. Natural and inviting.",
  luxury: "High-end luxury interior design photography. Rich textures, elegant lighting, sophisticated atmosphere.",
  minimal: "Scandinavian minimalist style. Clean lines, neutral tones, airy and spacious feel.",
  coastal: "Mediterranean/coastal style. Warm natural light, ocean-inspired tones, relaxed elegance.",
};

const INTENSITY_PROMPTS: Record<string, string> = {
  light: "Make subtle improvements: slightly brighter, cleaner colors, minor adjustments only.",
  balanced: "Enhance noticeably: improve lighting significantly, warm tones, professional quality.",
  strong: "Maximum Airbnb optimization: ultra-bright, warm inviting tones, enhanced saturation, magazine-quality result.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, style = "standard", intensity = "balanced", analysis } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.standard;
    const intensityPrompt = INTENSITY_PROMPTS[intensity] || INTENSITY_PROMPTS.balanced;

    let analysisContext = "";
    if (analysis) {
      analysisContext = `\nAnalysis context: Room type: ${analysis.roomType}. Issues: ${(analysis.issues || []).join(", ")}. Suggestions: ${(analysis.stagingSuggestions || []).join(", ")}.`;
    }

    const editPrompt = `Transform this property photo into a high-conversion Airbnb listing image. ${stylePrompt} ${intensityPrompt}${analysisContext}

Key requirements:
- Ultra bright and clean result
- Warm, inviting tones
- Professional photography look
- Highlight space and depth
- Remove visual noise and clutter
- Enhance natural light sources
- Keep the image photorealistic (not AI-looking)
- Make it scroll-stopping for Airbnb thumbnails`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: editPrompt },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        modalities: ["image", "text"],
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
        return new Response(JSON.stringify({ error: "Crédits épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const optimizedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!optimizedImageUrl) {
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ optimizedImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("photo-optimizer-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

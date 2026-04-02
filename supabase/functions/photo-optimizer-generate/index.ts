import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  standard: "Clean, bright, professional real estate photography. Natural warmth, golden hour tone.",
  luxury: "High-end luxury interior design photography. Rich textures, elegant warm lighting, sophisticated atmosphere. Deep wood tones, plush fabrics with depth.",
  minimal: "Scandinavian minimalist style. Ultra-bright, airy, spacious feel. Clean whites (never grey), soft natural light flooding the space.",
  coastal: "Mediterranean/coastal style. Warm golden light, ocean-inspired accents, relaxed luxury. Soft glowing highlights around windows.",
};

const INTENSITY_PROMPTS: Record<string, string> = {
  light: "Enhance noticeably: +30% brightness, warmer tones, open shadows, cleaner whites. The difference must be clearly visible.",
  balanced: "Strong enhancement: +50% perceived brightness, warm golden hour grading, aggressive shadow opening, vibrant selective saturation (+20). Magazine-quality result.",
  strong: "Maximum Airbnb optimization: +70-80% perceived brightness, ultra-warm inviting tones, fully opened shadows (no dark zones), enhanced saturation (+30 selective), simulated daylight flooding from windows, directional light gradients. The image must stop scrolling instantly.",
};

const BASE_PROMPT = `You are a high-end real estate photo editor specialized in Airbnb conversion optimization.

ABSOLUTE PRIORITY: The result must feel SIGNIFICANTLY brighter, more vibrant, more premium, and emotionally attractive than the original. If it looks similar to the original, you have failed.

LIGHTING (TOP PRIORITY — NON-NEGOTIABLE):
- Increase perceived brightness VERY strongly
- Completely remove all dull or dark zones
- Open shadows aggressively (no black areas)
- Simulate natural daylight entering from windows
- Create directional light gradients (never flat lighting)
- The room must feel flooded with light, airy, spacious, premium
- Must look brighter than reality but still believable

COLOR & SATURATION (AIRBNB OPTIMIZED):
- Apply warm color grading (golden hour tone)
- Increase saturation selectively
- Wood → richer and warmer | Plants → vibrant green | Fabrics → more depth and contrast
- Whites must be clean, bright, slightly warm — NEVER grey
- Goal: "vacation feeling" + "luxury comfort"

CONTRAST & DEPTH:
- Increase local contrast (NOT harsh global contrast)
- Enhance textures (wood, fabric, floor)
- Add depth perception with subtle micro-darkening for relief
- Image must feel more 3D, more detailed, more premium

WINDOW & LIGHT MANAGEMENT:
- Reduce overexposed windows (recover highlights)
- Keep visible exterior (sky slightly visible)
- Add soft glow around window light
- Balance: interior bright, exterior still readable

REALISM (ANTI-AI):
- Add subtle non-uniform grain
- Slight chromatic aberration
- Natural shadow gradients
- Imperfect reflections
- Avoid: flat lighting, artificial look, plastic textures, over-smoothing

FINAL GOAL: Create an image that stops scrolling instantly, creates desire to stay, and increases booking intent. This is visual conversion engineering.`;

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

    const editPrompt = `${BASE_PROMPT}

Style: ${stylePrompt}
Intensity: ${intensityPrompt}${analysisContext}

Transform this property photo now. The result MUST be dramatically brighter and more inviting than the original.`;

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

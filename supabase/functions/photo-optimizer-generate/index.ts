import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  standard: "Clean, bright, professional real estate photography. Neutral white balance, natural tones, magazine-quality finish.",
  luxury: "High-end luxury interior photography. Rich textures, elegant lighting, sophisticated atmosphere. Deep wood tones, plush fabrics with depth. Premium but natural.",
  minimal: "Scandinavian minimalist style. Ultra-bright, airy, spacious feel. Pure clean whites, soft natural light flooding the space. Crisp and modern.",
  coastal: "Mediterranean/coastal style. Natural golden light, ocean-inspired accents, relaxed luxury. Soft highlights around windows, warm but balanced.",
};

const INTENSITY_PROMPTS: Record<string, string> = {
  light: "Subtle professional enhancement: correct white balance, open shadows slightly, clean whites, +10 selective saturation. The result must look naturally better.",
  balanced: "Professional real estate editing: correct white balance first, balance interior/exterior exposure (HDR-like), open shadows, S-curve contrast for depth, +15 selective saturation. Magazine-quality result.",
  strong: "Maximum professional enhancement: perfect white balance, full HDR interior/exterior balance, aggressive shadow recovery, strong S-curve contrast, +20 selective saturation, enhanced textures. Must look like a top real estate photographer edited it.",
};

const BASE_PROMPT = `You are a professional real estate photo editor for luxury Airbnb listings.

CRITICAL RULES — STRUCTURE PRESERVATION (NON-NEGOTIABLE):
- DO NOT modify, replace, move, or remove ANY existing element (walls, mirrors, furniture, objects, architecture)
- DO NOT replace a mirror with a painting or any object with another
- DO NOT alter the layout or perspective
- ONLY color correction, lighting, and enhancement are allowed

STEP 1 — WHITE BALANCE (MANDATORY FIRST):
- Neutralize ALL color casts before any other edit
- Whites (walls, ceilings, surfaces) must be PURE and clean — not yellow, not orange, not grey
- Use walls and ceilings as white reference points
- This is the foundation — if white balance is wrong, everything fails

STEP 2 — LIGHTING BALANCE:
- Balance interior and exterior light (HDR effect)
- Reduce overexposed windows — recover highlights, keep exterior visible
- Brighten interior evenly WITHOUT burning highlights
- Open shadows while maintaining depth and dimension
- Create natural, even exposure throughout the room

STEP 3 — COLOR GRADING (PRO LEVEL):
- Apply slight warm tone ONLY AFTER white balance is correct
- Controlled saturation: +10 to +20 maximum, never more
- Never oversaturate walls or floors
- Enhance selectively: wood → warmer/richer, plants → natural green (not neon), fabrics → realistic
- Goal: natural luxury, not artificial

STEP 4 — CONTRAST & DEPTH:
- Apply S-curve tone adjustment for depth
- Increase local contrast — textures must pop (wood grain, fabric weave, floor detail)
- Avoid flat lighting — the image must feel three-dimensional
- Enhance sharpness subtly

REALISM (ANTI-AI):
- Add subtle non-uniform grain
- Natural shadow gradients
- Imperfect reflections preserved
- Avoid: flat lighting, plastic textures, over-smoothing, artificial glow

FINAL VALIDATION:
1. Are whites neutral and clean?
2. Is lighting balanced and professional?
3. Are colors natural and premium?
4. Does it look like a real photographer edited it — NOT like AI?
If any answer is NO → reprocess with stronger correction.

FINAL GOAL: The result must look like a professionally edited real estate photo — clean, bright, balanced, natural but premium. Real photography quality, not an AI filter.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, style = "standard", intensity = "balanced", analysis, homeStaging = false } = await req.json();
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

    let stagingPrompt = "";
    if (homeStaging) {
      stagingPrompt = `\n\nHOME STAGING (ENABLED — SUBTLE MODE):
You may add ONLY small, subtle, realistic lifestyle elements to enhance the scene:
- Kitchen/dining: fruit bowl, coffee cups, wine glasses, plates, light breakfast setup
- Living room: book, candle, small decorative object
- Bedroom: extra cushion, folded blanket/plaid
- Bathroom: rolled towels, small plant

STRICT RULES:
- DO NOT replace, move, or remove ANY existing object
- DO NOT overcrowd — add 1-3 items maximum
- ALL additions MUST respect the existing perspective, lighting, and shadows
- Items must look naturally placed, as if someone lives there
- If staging would reduce realism → skip staging entirely
- The original space must remain the focus`;
    }

    const editPrompt = `${BASE_PROMPT}

Style: ${stylePrompt}
Intensity: ${intensityPrompt}${analysisContext}${stagingPrompt}

Transform this property photo now. The result must look professionally edited, clean, bright, and balanced.`;

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

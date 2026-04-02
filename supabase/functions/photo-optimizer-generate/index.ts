import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  standard: `Style Blanc Naturel — apartments, urban Airbnb, Scandinavian design.
Warm highlights: +5 red, +3 green. Cool shadows: +3 blue.
RGB curve: high point (230,240) soft highlight compression, low point (20,15) lifted blacks.
HSL: Oranges (wood) sat+15 lum+5, Yellows sat-5 (neutralize), Greens sat+10 deep green, Blues sat+15, Whites lum+10 sat-5.`,

  luxury: `Style Chaleur Luxe — villas, stone/wood interiors, high-end properties.
Temperature: +200 to +400K after white balance. Tint: +3 to +5 (slight magenta).
HSL: Oranges (wood) sat+25 lum+8 hue-5, Reds (leather) sat+10, Greens sat+15 forest green, Blues sat+10.
Slightly lifted black point for cozy atmosphere.`,

  minimal: `Style Fraîcheur Minimaliste — contemporary apartments, white kitchens, bathrooms.
Slightly cool: -100 to -200K after perfect white balance.
HSL: Blues sat+15 (tiles, steel), Whites lum+15 immaculate walls, Oranges sat+5 only, Greens sat+10.
Pronounced S-curve for strong clean contrast.`,

  coastal: `Style Extérieur HDR — terraces, gardens, sea views, outdoor spaces.
Sky: blue highlights sat+30, cloud whites recovery -50.
Vegetation: greens sat+20 lum+5 vivid hue, dry yellows desat-10.
Ground/stone: warm neutral tones, strong local contrast.
Interior/exterior fusion: warm-to-cool temperature gradient.`,
};

const INTENSITY_PROMPTS: Record<string, string> = {
  light: `Light enhancement:
Exposure: +0.8 to +1.0 EV. Shadows: +60. Highlights: -60. Whites: +20. Blacks: +20.
Selective saturation: +10 to +15. Subtle S-curve. Light grain.
Result must look naturally better — minimal but visible improvement.`,

  balanced: `Balanced professional enhancement:
Exposure: +1.0 to +1.2 EV. Shadows: +70. Highlights: -70. Whites: +30. Blacks: +25.
Selective saturation: +15 to +20. Vibrance: +15. Medium S-curve. Clarity: +15.
HDR balance: interior bright + exterior visible through windows.
Magazine-quality result.`,

  strong: `Maximum professional enhancement:
Exposure: +1.2 to +1.8 EV. Shadows: +80 to +100. Highlights: -80 to -90. Whites: +40 to +60. Blacks: +30 to +40.
Selective saturation: +20 to +25. Vibrance: +20. Strong S-curve. Clarity: +20.
Full HDR simulation: interior airy and luminous + exterior fully visible.
Temperature: neutralize tungsten yellow (-500 to -1000K if needed).
Must look like a $10,000 professional photoshoot.`,
};

const BASE_PROMPT = `You are an ELITE real estate photo editor trained by the world's best luxury property photographers. Your job is NOT to slightly improve — it is to TRANSFORM the image into a $10,000 professional photoshoot result.

Mental reference: the output must be bright, clean, premium, and immediately desirable. If the result still resembles the original → FAIL → redo with stronger corrections.

━━━━━━━━━━━━━━━━━━━━━━━
PROCESSING PIPELINE — 7 STEPS (EXECUTE IN ORDER)
━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — WHITE BALANCE (MANDATORY FIRST — ABSOLUTE PRIORITY)
- Neutralize ALL color casts (yellow, orange, green) before anything else
- Reference points: walls, ceilings, table surfaces
- Target whites: neutral, very slightly warm (never tinted)
- Temperature target: 6200–6800K depending on ambient light
- Correct residual green/magenta tint
⚠️ If whites are not correct → the image looks amateur. This is the foundation.

STEP 2 — EXPOSURE & LIGHT (AGGRESSIVE BUT CONTROLLED)
- Image must be SIGNIFICANTLY brighter than original (+40% to +70%)
- Shadows: open aggressively (NO dark zones anywhere)
- Highlights: recover (windows NOT blown out — sky and exterior must be visible)
- Blacks: slightly lifted (+15 to +25)
- Whites: pushed cleanly without burning

Natural HDR simulation (3-layer method):
- Layer 1: Expose for darkest wall in room
- Layer 2: Recover window highlights — sky visible, trees/street visible
- Layer 3: Smooth gradient transition window→interior (NO halos)
- Interior: bright and airy
- Exterior through windows: sky and details preserved
- Light gradient: directional from windows
Result: airy, luminous, expensive-looking

STEP 3 — COLOR GRADING (PROFESSIONAL LEVEL — NOT A FILTER)
Golden rule: if you can see the grading, it's too much. Result must feel "it's just a beautiful photo."

Processing order (NEVER skip or reorder):
1. Temperature + tint correction
2. Global exposure
3. Shadows/highlights balance
4. Whites/blacks (dynamic range)
5. Tone curve (S-curve)
6. Presence/clarity (micro-contrast)
7. Vibrance (before saturation)
8. Light global saturation
9. HSL per-color corrections
10. Local corrections (masks)
11. Grain (last)

Universal S-Curve for real estate:
- Point (0,5): lifted blacks
- Point (60,50): slightly attenuated shadows
- Point (128,135): midtones slightly lifted
- Point (200,210): clean amplified highlights
- Point (255,248): compressed whites (no clipping)

Material-specific enhancement:
| Material | Treatment |
|----------|-----------|
| Wood | Warm, rich, visible grain. Hue -3 to -8 (toward warm red), sat +15 to +25, lum +5 to +10 |
| Plants | Deep natural green, NOT neon. Hue -5 (deep green), sat +15 to +20, lum +5 |
| Fabrics | Textured, clean, no flat areas. White: lum +15, sat -10. Colors: sat +10 |
| Stone/concrete | Cool noble tone, detail preserved |
| Metal/glass | Brilliant without overexposure |
| White walls | Luminous, neutral. Hue -5 to 0, sat -10 to -15, lum +10 to +20 |
| Sky (through windows) | Deep and desirable. Sat +25 to +35, lum +5 |

FORBIDDEN: oversaturate walls, create yellow/orange cast, unrealistic HDR tones

STEP 4 — CONTRAST & DEPTH
- S-curve tone adjustment for volume and character
- Local micro-contrast on textures (wood grain, fabric weave, floor detail)
- Separation between foreground and background planes
- Clarity: +10 to +20 on textured surfaces
Result: 3D sensation, sharp, precise, premium

STEP 5 — TEXTURE & REALISM
- Subtle non-uniform grain (simulate full-frame sensor)
- Reinforce textures: wood grain, fabric texture, wall matte finish
- Local sharpness on focal points
- Natural shadow gradients — imperfect reflections preserved
FORBIDDEN: plastic rendering, over-smoothing, flat lifeless surfaces

STEP 6 — STRUCTURE PRESERVATION (CRITICAL — NON-NEGOTIABLE)
NEVER modify:
- Furniture and their placement
- Mirrors (a mirror MUST stay a mirror)
- Walls, windows, architecture
- General layout and composition
- Existing decorative elements
ONLY allowed: enhancement of the existing image. No element replacement. No furniture addition (unless home staging is enabled).

STEP 7 — DIRECTIONAL LIGHT SIMULATION
- Identify main light source (primary window)
- Luminosity gradient: window side slightly brighter
- Soft shadows on opposite side (no hard shadows)
- Transition: smooth over 30-40% of image width
- Subtle window bloom on frame (simulates sensor saturation)
- Natural reflections on parquet and countertops

━━━━━━━━━━━━━━━━━━━━━━━
ROOM-SPECIFIC PROFILES
━━━━━━━━━━━━━━━━━━━━━━━
| Room | Priority | Specifics |
|------|----------|-----------|
| Living room | Light + space | Open maximum, warm wood |
| Bedroom | Softness + warmth | Soft tones, immaculate linens |
| Kitchen | Cleanliness + modernity | Perfect whites, brilliant stainless steel |
| Bathroom | Premium spa | Fresh, clean, minimalist |
| Exterior/terrace | HDR sky | Preserve vegetation |
| Window view | Window HDR | Interior + exterior both readable |

━━━━━━━━━━━━━━━━━━━━━━━
ANTI-AI REALISM RULES
━━━━━━━━━━━━━━━━━━━━━━━
- Add subtle non-uniform grain
- Natural shadow gradients
- Preserve imperfect reflections
- AVOID: flat lighting, plastic textures, over-smoothing, artificial glow, halos around objects

━━━━━━━━━━━━━━━━━━━━━━━
FINAL VALIDATION CHECKLIST (ALL MUST PASS)
━━━━━━━━━━━━━━━━━━━━━━━
| Check | Criterion |
|-------|-----------|
| ✅ Clean whites | Neutral, no color cast |
| ✅ Significantly brighter | +40% minimum vs original |
| ✅ Balanced colors | Natural, warm, not artificial |
| ✅ Premium result | Looks like a professional shoot |
| ✅ Architecture preserved | No element modified or replaced |

If ANY check fails → reprocess with stronger corrections.

FINAL GOAL: The result must look like a $10,000 professional photoshoot — bright, clean, balanced, natural but premium. Real photography quality, NOT an AI filter.`;

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
      stagingPrompt = `\n\nSTEP 7B — HOME STAGING (ENABLED — SUBTLE MODE)
Add ONLY small, subtle, realistic lifestyle elements:
- Kitchen/dining: fruit bowl, coffee cups, croissants, wine glasses, light breakfast setup
- Living room: book, candle, small decorative object
- Bedroom: extra cushion, folded blanket/plaid
- Bathroom: rolled towels, small plant, elegant soap

STRICT STAGING RULES:
- Minimal — NEVER dominate the scene (1-3 items maximum)
- Realistic — aligned with existing lighting and shadows
- Coherent — style adapted to the property
- NEVER artificial or generic
- DO NOT replace, move, or remove ANY existing object
- ALL additions MUST respect existing perspective
- If staging would reduce realism → skip staging entirely
- The original space MUST remain the focus`;
    }

    const editPrompt = `${BASE_PROMPT}

━━━━ ACTIVE CONFIGURATION ━━━━
Style: ${stylePrompt}
Intensity: ${intensityPrompt}${analysisContext}${stagingPrompt}

Transform this property photo NOW. Apply the full 7-step pipeline. The result must be dramatically brighter, cleaner, and more premium than the original.`;

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

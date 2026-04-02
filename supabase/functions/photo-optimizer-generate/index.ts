import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  standard: `Style Blanc Naturel — apartments, urban Airbnb, Scandinavian design.
Warm highlights: +8 red, +5 green. Cool shadows: +5 blue.
RGB curve: high point (225,240) soft highlight compression, low point (15,10) lifted blacks.
HSL: Oranges (wood) sat+20 lum+8, Yellows sat-8 (neutralize casts), Greens sat+15 deep green, Blues sat+20, Whites lum+15 sat-8.
Temperature: 6400K neutral-warm. Tint: +2 (very slight magenta for skin-friendly warmth).`,

  luxury: `Style Chaleur Luxe — villas, stone/wood interiors, high-end Côte d'Azur properties.
Temperature: +250 to +450K after white balance. Tint: +5 to +8 (warm magenta glow).
HSL: Oranges (wood) sat+30 lum+10 hue-8 (rich amber), Reds (leather/terracotta) sat+15, Greens sat+20 hue-8 (deep Mediterranean green), Blues sat+15 lum+5 (pool/sky enhancement).
Lifted black point +15 for cozy cinematic atmosphere.
Add subtle warm bloom on window light sources.`,

  minimal: `Style Fraîcheur Minimaliste — contemporary apartments, white kitchens, bathrooms, modern spaces.
Slightly cool: -150 to -250K after perfect white balance for clinical cleanliness.
HSL: Blues sat+20 lum+5 (tiles, steel, glass), Whites lum+20 immaculate walls, Oranges sat+8 subtle warmth only, Greens sat+12.
Strong S-curve for clean architectural contrast. Clarity +20 on hard surfaces.
Micro-contrast emphasis on geometric lines and clean edges.`,

  coastal: `Style Extérieur Côte d'Azur — terraces, gardens, sea views, pool areas, Mediterranean outdoor spaces.
Sky: blue highlights sat+35 lum+8, cloud whites recovery -60 for dramatic sky preservation.
Sea/pool: cyan sat+25, blue sat+30, turquoise enhancement.
Vegetation: greens sat+25 lum+8 vivid hue-5 (lush Mediterranean), dry yellows desat-15.
Ground/stone: warm neutral tones with strong local contrast for texture.
Interior/exterior fusion: warm-to-cool temperature gradient across window boundaries.
Golden hour simulation: subtle warm rim light on surfaces facing windows.`,
};

const INTENSITY_PROMPTS: Record<string, string> = {
  light: `Light enhancement — subtle but visible improvement:
Exposure: +0.8 to +1.0 EV. Shadows: +60. Highlights: -60. Whites: +25. Blacks: +20.
Selective saturation: +12 to +18. Vibrance: +10. Subtle S-curve. Light grain.
Clarity: +10 on textures only. Color temperature: correct only, minimal shift.
Result must look naturally better — like a good photographer's quick edit.`,

  balanced: `Balanced professional enhancement — magazine-quality result:
Exposure: +1.0 to +1.4 EV. Shadows: +75. Highlights: -75. Whites: +35. Blacks: +25.
Selective saturation: +18 to +25. Vibrance: +18. Medium-strong S-curve. Clarity: +18.
HDR balance: interior bright and airy + exterior visible through windows with sky detail.
Directional light enhancement from primary window source.
Color grading: warm luxury tone without cast. Wood enrichment, wall neutralization.
Result: professional real estate photography level.`,

  strong: `Maximum professional enhancement — luxury listing visual impact:
Exposure: +1.4 to +2.0 EV. Shadows: +85 to +100. Highlights: -85 to -95. Whites: +45 to +65. Blacks: +35 to +45.
Selective saturation: +22 to +30. Vibrance: +25. Strong S-curve with lifted blacks. Clarity: +22.
Full HDR simulation: interior luminous and airy + exterior fully visible with sky and vegetation detail.
Temperature: aggressively neutralize tungsten yellow (-600 to -1200K if needed), then add +150K warm luxury tone.
Directional sunlight simulation: strong gradient from windows, natural floor reflections, subtle bloom.
Micro-contrast: +25 on wood, stone, fabric textures for tactile depth.
Must look like a luxury villa photoshoot for Architectural Digest or premium Airbnb Plus listing.`,
};

const BASE_PROMPT = `You are an ELITE real estate photo editor specialized in luxury Airbnb listings and premium vacation rental markets (French Riviera, Mediterranean, high-end coastal properties).

Your mission: TRANSFORM the image into an ultra-premium, high-conversion listing photo. The result must make viewers instantly want to book. If the output still resembles the original → FAIL → redo with dramatically stronger corrections.

━━━━━━━━━━━━━━━━━━━━━━━
ABSOLUTE PRIORITY — STRUCTURE PRESERVATION (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━
NEVER modify, replace, remove, or add:
- Furniture, sofas, chairs, tables, beds (keep exact position and appearance)
- Mirrors (a mirror MUST stay a mirror — never replace with art or window)
- Walls, windows, doors, architecture
- Layout, composition, camera angle
- Existing decorative objects

The ONLY additions allowed (when home staging is enabled):
- Small items on FLAT SURFACES ONLY (tables, counters, beds)
- Examples: breakfast setup, wine glasses, fruit bowl, folded blanket, towels
- Maximum 1-3 items, must match perspective and lighting perfectly

If ANY structural modification is detected → CANCEL and redo enhancement only.

━━━━━━━━━━━━━━━━━━━━━━━
PROCESSING PIPELINE — 7 STEPS (EXECUTE IN STRICT ORDER)
━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — WHITE BALANCE (FOUNDATION — DO THIS FIRST)
- Neutralize ALL color casts before anything else (yellow, orange, green, blue)
- Reference surfaces: walls, ceilings, white furniture, countertops
- Target whites: clean, neutral, with very slight warm luxury undertone
- Temperature target: 6200–6800K depending on light source
- Correct residual green/magenta tint precisely
⚠️ If whites are not neutral → the entire image is considered FAILED. This is the foundation of premium photography.

STEP 2 — EXPOSURE & HDR (HIGH IMPACT — BE AGGRESSIVE)
- Increase overall brightness by +50% to +80% compared to original
- Shadows: open AGGRESSIVELY — absolutely NO dark zones anywhere in the image
- Highlights: recover carefully — windows must show sky, trees, exterior detail
- Blacks: lift to +15 to +30 (cinematic depth, not crushed)
- Whites: push cleanly to +30 to +50 without clipping

Natural HDR simulation (3-layer method):
- Layer 1: Expose for darkest corner/wall in room → make it bright
- Layer 2: Recover window highlights → sky visible, vegetation visible, no blowout
- Layer 3: Smooth gradient transition from window to interior (NO halos, NO artifacts)
Result: luminous, airy, spacious, expensive-looking interior with visible exterior

STEP 3 — DIRECTIONAL LIGHT SIMULATION (KEY DIFFERENTIATOR)
- Identify the primary natural light source (main window/door)
- Create a realistic directional light gradient across the room
- Window side: +15-25% brighter with subtle warm bloom on frame
- Opposite side: gentle soft shadow, never dark
- Transition: smooth over 30-40% of image width
- Floor reflections: enhance natural parquet/tile reflections from light direction
- Surfaces facing light: subtle warm rim highlight
The space must feel sunlit, spacious, and high-end — like golden hour streaming in.

STEP 4 — COLOR GRADING (LUXURY COASTAL — NOT A FILTER)
Golden rule: if the grading is visible as "applied," it's overdone. Must feel like "this is just a beautiful space."

Processing order (NEVER skip or reorder):
1. Temperature + tint correction (already done in Step 1)
2. Global exposure adjustment
3. Shadows/highlights balance
4. Whites/blacks dynamic range
5. Tone curve (S-curve)
6. Presence/clarity (micro-contrast)
7. Vibrance (before saturation)
8. Selective saturation per channel
9. HSL per-color corrections
10. Local corrections (luminosity masks)
11. Grain (last, very subtle)

Universal S-Curve for real estate:
- Point (0,8): lifted blacks (cinematic)
- Point (55,45): slightly compressed shadows
- Point (128,140): midtones lifted for brightness
- Point (200,215): clean amplified highlights
- Point (255,248): compressed whites (no clipping)

Material-specific enhancement:
| Material | Treatment |
|----------|-----------|
| Wood | Rich, warm, visible grain. Hue -5 to -10 (toward amber), sat +20 to +30, lum +8 to +12 |
| Plants/vegetation | Deep natural green, NEVER neon. Hue -5 to -8 (deep green), sat +18 to +25, lum +5 to +8 |
| Fabrics/linens | Textured, clean, never flat. White fabrics: lum +20, sat -12. Colored: sat +12 |
| Stone/marble/concrete | Cool noble tone, texture detail preserved, micro-contrast +15 |
| Metal/stainless steel | Brilliant reflections without overexposure, clarity +15 |
| White walls | Luminous, NEUTRAL. Hue 0, sat -12 to -18, lum +15 to +25 |
| Sky (through windows) | Deep, desirable, Mediterranean blue. Sat +30 to +40, lum +5 to +8 |
| Pool/water | Turquoise enhancement. Cyan sat+25, blue lum+8 |
| Terracotta/tiles | Warm earthy tone, sat +10, clarity +12 |

FORBIDDEN: oversaturated walls, yellow/orange color cast, unrealistic HDR glow, neon colors, oversaturated skin tones

STEP 5 — CONTRAST & DEPTH
- S-curve tone adjustment for volume and premium character
- Local micro-contrast on textures: wood grain +20, fabric weave +15, floor detail +18, stone +22
- Separation between foreground, midground, and background planes
- Clarity: +15 to +25 on textured surfaces (NOT on skin or soft fabrics)
- Dehaze: +5 to +10 for atmospheric clarity
Result: 3D sensation, tactile depth, sharp, precise, premium feel

STEP 6 — TEXTURE & ANTI-AI REALISM
- Add subtle non-uniform grain (simulate Sony A7R IV full-frame sensor, ISO 100-400)
- Grain must be: non-uniform, slightly stronger in shadows, lighter in highlights
- Reinforce natural textures: wood grain detail, fabric thread texture, wall matte finish, floor material
- Local sharpness on focal points (furniture edges, architectural lines)
- Preserve natural shadow gradients — shadows must have subtle color variation
- Maintain imperfect reflections (mirrors, glass, polished surfaces)
ABSOLUTELY FORBIDDEN: plastic rendering, over-smoothing, flat lifeless surfaces, AI glow, halo artifacts, loss of texture detail

STEP 7 — FINAL PREMIUM POLISH
- Subtle vignette: -8 to -12 (draw eye to center)
- Lens correction simulation: minimal barrel distortion awareness
- Final white balance check: are whites still neutral after all processing?
- Final exposure check: is the image dramatically brighter than original?
- Final color check: warm luxury feel without any cast?

━━━━━━━━━━━━━━━━━━━━━━━
ROOM-SPECIFIC PROFILES
━━━━━━━━━━━━━━━━━━━━━━━
| Room | Priority | Specifics |
|------|----------|-----------|
| Living room | Light + space + warmth | Open shadows maximum, enrich wood, warm textiles, bright airy feel |
| Bedroom | Softness + luxury | Soft warm tones, immaculate crisp linens, inviting atmosphere |
| Kitchen | Cleanliness + modernity | Perfect neutral whites, brilliant stainless steel, clean counters |
| Bathroom | Premium spa feel | Fresh cool-neutral, clean tiles, bright mirrors, minimalist luxury |
| Exterior/terrace | HDR sky + vegetation | Mediterranean blue sky, lush green vegetation, warm stone |
| Pool area | Turquoise water + sky | Vivid pool color, dramatic sky, warm surrounding stone |
| Window view | Dual exposure | Interior bright AND exterior fully readable, smooth transition |

━━━━━━━━━━━━━━━━━━━━━━━
ANTI-AI REALISM RULES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━
- Non-uniform subtle grain (stronger in shadows)
- Natural shadow color variation (not pure black/grey)
- Preserved imperfect reflections in mirrors and glass
- Micro-texture detail on all surfaces
- AVOID: flat uniform lighting, plastic textures, over-smoothing, artificial glow, halos around objects, loss of natural imperfections, "AI-generated" look

━━━━━━━━━━━━━━━━━━━━━━━
FINAL VALIDATION CHECKLIST (ALL MUST PASS)
━━━━━━━━━━━━━━━━━━━━━━━
| # | Check | Criterion |
|---|-------|-----------|
| 1 | ✅ Clean whites | Neutral, no color cast whatsoever |
| 2 | ✅ Dramatically brighter | +50% minimum brightness vs original |
| 3 | ✅ Premium colors | Natural, warm luxury, not artificial |
| 4 | ✅ Wow effect | Instantly striking — would stop scrolling |
| 5 | ✅ Architecture intact | No element modified, replaced, or added |
| 6 | ✅ Realistic | Looks like professional photography, NOT AI |
| 7 | ✅ Directional light | Natural light gradient visible from windows |

If ANY check fails → reprocess with significantly stronger corrections.

FINAL GOAL: The result must look like a $15,000 professional real estate photoshoot for a luxury Côte d'Azur villa listing — bright, clean, balanced, warm, natural but unmistakably premium. Real photography quality that stops scrolling and creates instant booking desire. This is NOT editing — this is visual conversion engineering.`;

type PhotoAnalysis = {
  roomType?: string;
  issues?: string[];
  stagingSuggestions?: string[];
};

type ValidationResult = {
  pass: boolean;
  summary: string;
  violations: string[];
  retryGuidance: string;
  structurePreserved: boolean;
  allowedChangesOnly: boolean;
  stagingCompliance: boolean;
  confidence?: number;
};

const IMAGE_EDIT_MODEL = "gpt-image-1";
const VALIDATION_MODEL = "gpt-4o";
const MAX_EDIT_ATTEMPTS = 3;

const STRICT_EDIT_LOCK_PROMPT = `
━━━━━━━━━━━━━━━━━━━━━━━
STRICT EDIT LOCK — HIGHEST PRIORITY
━━━━━━━━━━━━━━━━━━━━━━━
This is a PHOTO EDITING task, NOT an image generation task.
Treat the uploaded image as a LOCKED reference plate, like Lightroom or Photoshop editing.

NON-NEGOTIABLE RULES:
- Preserve the exact geometry, perspective, camera angle, crop, and composition.
- Preserve the exact furniture, decor, objects, walls, windows, mirrors, doors, appliances, and architecture.
- Preserve the exact object count, exact object positions, and exact room layout.
- NEVER reinterpret, redesign, rebuild, restyle, replace, remove, move, resize, or invent any part of the scene.

ALLOWED ACTIONS ONLY:
- lighting enhancement
- white balance / color cast correction
- exposure balancing / HDR-style recovery
- color grading
- contrast / tone curve / depth refinement
- texture and clarity improvements that keep the exact same surfaces

FORBIDDEN ACTIONS:
- changing furniture shape, style, material, or placement
- changing decor, bedding, mirrors, art, accessories, or architecture
- altering room dimensions, perspective, or layout
- hallucinating new objects or removing existing ones

If there is any tension between enhancement and structure preservation, ALWAYS preserve structure and make a lighter edit.
If the output is not the same exact scene, the result is invalid.`;

const VALIDATION_SYSTEM_PROMPT = `You are a strict photo QA inspector for premium real-estate image editing.
Your only job is to compare an ORIGINAL photo and an EDITED candidate.

Approve ONLY if the edited image keeps the SAME exact scene and changes ONLY photometric qualities:
- lighting
- white balance
- exposure
- color
- contrast
- texture / clarity

Reject if ANY structural or semantic scene change appears, including:
- furniture changes
- object additions/removals/movements
- decor changes
- architecture changes
- layout / geometry / perspective changes
- replaced mirrors, windows, walls, appliances, or accessories

Home staging rules:
- If home staging is OFF: any new object must FAIL.
- If home staging is ON: allow only 1-3 tiny lifestyle items placed on existing flat surfaces (table, bed, countertop) with no other scene change.

Be strict. If you are uncertain, reject.`;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildAnalysisContext(analysis?: PhotoAnalysis) {
  if (!analysis) return "";

  const parts: string[] = [];
  if (analysis.roomType) parts.push(`Room type: ${analysis.roomType}.`);
  if (Array.isArray(analysis.issues) && analysis.issues.length > 0) {
    parts.push(`Known issues: ${analysis.issues.join(", ")}.`);
  }
  if (Array.isArray(analysis.stagingSuggestions) && analysis.stagingSuggestions.length > 0) {
    parts.push(`Potential staging targets: ${analysis.stagingSuggestions.join(", ")}.`);
  }

  return parts.length > 0 ? `\nAnalysis context: ${parts.join(" ")}` : "";
}

function buildStagingPrompt(homeStaging: boolean) {
  if (!homeStaging) {
    return `\n\nHOME STAGING: DISABLED
Add ZERO new objects. Do not place anything anywhere. Deliver a strict photometric edit only.`;
  }

  return `\n\nSTEP 7B — HOME STAGING (ENABLED — STRICT MICRO-STAGING)
Only if it improves realism, add 1-3 tiny lifestyle elements on existing FLAT SURFACES ONLY:
- Kitchen/dining: fruit bowl, coffee cups, croissants, wine glasses, light breakfast setup
- Living room: book, candle, small decorative object
- Bedroom: extra cushion, folded blanket/plaid
- Bathroom: rolled towels, small plant, elegant soap

STRICT STAGING RULES:
- Minimal — NEVER dominate the scene
- Flat surfaces only — table, bed, countertop
- Realistic — aligned with existing lighting and shadows
- Coherent — adapted to the property style
- NEVER artificial or generic
- DO NOT replace, move, remove, or alter ANY existing object
- If staging risks realism or structure preservation → skip staging entirely
- The original space MUST remain unchanged apart from tiny flat-surface additions`;
}

function buildEditPrompt(params: {
  stylePrompt: string;
  intensityPrompt: string;
  analysisContext: string;
  stagingPrompt: string;
  attempt: number;
  validationFeedback: string;
}) {
  const retryBlock = params.attempt > 1 && params.validationFeedback
    ? `\n\nQC REJECTION FROM PREVIOUS ATTEMPT:
${params.validationFeedback}

Retry with an even stricter edit-only approach. Use lighter corrections if needed, but NEVER alter the scene.`
    : "";

  return `${STRICT_EDIT_LOCK_PROMPT}

${BASE_PROMPT}

━━━━ ACTIVE CONFIGURATION ━━━━
Style: ${params.stylePrompt}
Intensity: ${params.intensityPrompt}${params.analysisContext}${params.stagingPrompt}${retryBlock}

FINAL EXECUTION RULE:
Behave like a world-class Lightroom/Photoshop editor working on a locked source photo.
Return the SAME exact scene, with stronger light/color/contrast quality only.
If you cannot fully preserve the structure, make the edit lighter rather than changing the image.`;
}

function parseImageDataUrl(imageBase64: string) {
  const base64Match = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) {
    throw new Error("Invalid image format — expected data:image/...;base64,...");
  }

  return {
    imageFormat: base64Match[1] === "jpg" ? "jpeg" : base64Match[1],
    rawBase64: base64Match[2],
  };
}

function createImageBlob(imageBase64: string) {
  const { imageFormat, rawBase64 } = parseImageDataUrl(imageBase64);
  const binaryString = atob(rawBase64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return {
    imageFormat,
    imageBlob: new Blob([bytes], { type: `image/${imageFormat}` }),
  };
}

async function handleOpenAiFailure(response: Response, label: string): Promise<never> {
  const errText = await response.text();
  console.error(`${label} error:`, response.status, errText);

  if (response.status === 429) {
    throw new HttpError(429, "Trop de requêtes, réessayez dans un moment.");
  }

  if (response.status === 402 || response.status === 403) {
    throw new HttpError(402, "Crédits OpenAI épuisés ou accès refusé.");
  }

  throw new Error(`${label}: ${response.status} — ${errText}`);
}

async function requestStrictEdit(params: {
  apiKey: string;
  imageBlob: Blob;
  imageFormat: string;
  editPrompt: string;
}) {
  const formData = new FormData();
  formData.append("image", params.imageBlob, `photo.${params.imageFormat === "jpeg" ? "jpg" : params.imageFormat}`);
  formData.append("prompt", params.editPrompt);
  formData.append("model", IMAGE_EDIT_MODEL);
  formData.append("size", "auto");
  formData.append("quality", "high");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    await handleOpenAiFailure(response, "OpenAI image edit");
  }

  const data = await response.json();
  const generatedB64 = data.data?.[0]?.b64_json;
  if (!generatedB64) throw new Error("No image generated by OpenAI");

  return `data:image/png;base64,${generatedB64}`;
}

async function validateStrictEdit(params: {
  apiKey: string;
  originalImageUrl: string;
  editedImageUrl: string;
  homeStaging: boolean;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VALIDATION_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: VALIDATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Compare these two real-estate photos. Image 1 is the ORIGINAL locked input. Image 2 is the EDITED candidate. ${params.homeStaging
                ? "Home staging is ON. Approve tiny flat-surface-only additions only if the rest of the scene is identical."
                : "Home staging is OFF. Any new object or removed object must fail."}
Approve only if geometry, layout, furniture, objects, architecture, and composition are effectively identical, and only lighting/color/contrast/texture have changed.`,
            },
            { type: "text", text: "ORIGINAL IMAGE" },
            {
              type: "image_url",
              image_url: {
                url: params.originalImageUrl,
                detail: "low",
              },
            },
            { type: "text", text: "EDITED IMAGE TO VALIDATE" },
            {
              type: "image_url",
              image_url: {
                url: params.editedImageUrl,
                detail: "low",
              },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "validate_photo_edit",
            description: "Validate whether an edited property photo preserves the original structure and changes only allowed visual properties.",
            parameters: {
              type: "object",
              properties: {
                pass: { type: "boolean" },
                confidence: { type: "number" },
                summary: { type: "string" },
                violations: {
                  type: "array",
                  items: { type: "string" },
                },
                retryGuidance: { type: "string" },
                structurePreserved: { type: "boolean" },
                allowedChangesOnly: { type: "boolean" },
                stagingCompliance: { type: "boolean" },
              },
              required: [
                "pass",
                "confidence",
                "summary",
                "violations",
                "retryGuidance",
                "structurePreserved",
                "allowedChangesOnly",
                "stagingCompliance",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "validate_photo_edit" },
      },
    }),
  });

  if (!response.ok) {
    await handleOpenAiFailure(response, "OpenAI validation");
  }

  const data = await response.json();
  const rawArguments = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!rawArguments) {
    throw new Error("OpenAI validation did not return structured output");
  }

  const parsed = JSON.parse(rawArguments);
  return {
    pass: Boolean(parsed.pass && parsed.structurePreserved && parsed.allowedChangesOnly && parsed.stagingCompliance),
    summary: typeof parsed.summary === "string" ? parsed.summary : "Validation failed",
    violations: Array.isArray(parsed.violations) ? parsed.violations.filter((item: unknown) => typeof item === "string") : [],
    retryGuidance: typeof parsed.retryGuidance === "string" ? parsed.retryGuidance : "Keep the exact same scene and reduce the edit scope to lighting and color only.",
    structurePreserved: Boolean(parsed.structurePreserved),
    allowedChangesOnly: Boolean(parsed.allowedChangesOnly),
    stagingCompliance: Boolean(parsed.stagingCompliance),
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : undefined,
  } satisfies ValidationResult;
}

function buildValidationFeedback(validation: ValidationResult) {
  const violations = validation.violations.length > 0
    ? `Violations detected: ${validation.violations.join("; ")}.`
    : "Violations detected: structural mismatch.";

  return `${validation.summary} ${violations} Retry guidance: ${validation.retryGuidance}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, style = "standard", intensity = "balanced", analysis, homeStaging = false } = await req.json();
    if (!imageBase64) {
      return jsonResponse({ error: "imageBase64 required" }, 400);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.standard;
    const intensityPrompt = INTENSITY_PROMPTS[intensity] || INTENSITY_PROMPTS.balanced;
    const analysisContext = buildAnalysisContext(analysis as PhotoAnalysis | undefined);
    const stagingPrompt = buildStagingPrompt(Boolean(homeStaging));
    const { imageBlob, imageFormat } = createImageBlob(imageBase64);

    const editPrompt = buildEditPrompt({
      stylePrompt,
      intensityPrompt,
      analysisContext,
      stagingPrompt,
      attempt: 1,
      validationFeedback: "",
    });

    const optimizedImageUrl = await requestStrictEdit({
      apiKey: OPENAI_API_KEY,
      imageBlob,
      imageFormat,
      editPrompt,
    });

    return jsonResponse({ optimizedImageUrl });
  } catch (e) {
    console.error("photo-optimizer-generate error:", e);

    if (e instanceof HttpError) {
      return jsonResponse({ error: e.message }, e.status);
    }

    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

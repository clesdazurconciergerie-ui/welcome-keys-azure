import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ══════════════════════════════════════════════════════
// NODALVIEW-INSPIRED PROMPT
// Based on how Nodalview processes real estate photos:
//   → Bright, airy interiors
//   → Windows visible with sky detail
//   → Clean whites, zero noise
//   → Natural warmth without orange cast
//   → Magazine-quality listing aesthetic
// ══════════════════════════════════════════════════════

const NODALVIEW_PROMPT = `You are a world-class real estate photo editor. Your job is to transform this property photo into a premium listing image — the kind you see on Airbnb Plus, Booking.com Preferred, or luxury real estate agency websites.

Study how Nodalview, a professional real estate photography platform, produces its images. Their signature look is:
- EXTREMELY bright and airy interiors — rooms feel flooded with natural light
- Windows show the exterior clearly (sky, trees, garden) — never blown out white
- Walls are clean, bright white or their true color — never grey or dingy
- Colors are vivid but natural — wood looks warm, tiles look clean, fabrics look soft
- Zero noise, zero grain — as clean as a medium format camera
- Perfect vertical lines — no wide-angle distortion
- The overall feeling is: "I want to live here"

━━━━ STRICT RULES ━━━━
🔒 DO NOT change, add, remove, or move ANY furniture, object, decoration, or architectural element
🔒 DO NOT alter the room layout, perspective, or composition
🔒 DO NOT add virtual staging elements (unless home staging is explicitly enabled below)
🔒 The result must be the EXACT same scene — only light, color, and clarity are enhanced
🔒 Someone who knows this property must instantly recognize it

━━━━ ENHANCEMENT STEPS ━━━━

1. WHITE BALANCE: Set to neutral daylight (5500-6200K). Eliminate any yellow, orange, or green color cast from artificial lighting. Whites must look white.

2. EXPOSURE & BRIGHTNESS: This is the #1 priority. Push the interior brightness to maximum realistic level. The room must feel bathed in natural light. Dark corners are unacceptable — lift every shadow aggressively.

3. WINDOW RECOVERY: If windows are visible, balance interior and exterior exposure. The sky and outdoor scenery must be visible through windows — not blown out white. This is the Nodalview signature look: bright interior + visible exterior.

4. SHADOWS & HIGHLIGHTS:
   - Shadows: lift +80 to +100 (reveal ALL detail in dark areas)
   - Highlights: recover -40 to -60 (preserve window views and bright surfaces)
   - Result: flat, even lighting across the entire room

5. COLOR GRADING:
   - Vibrance: +30 to +40 (colors must pop and feel alive)
   - Saturation: +15 to +20 (moderate, natural boost)
   - Wood tones: warm and rich amber
   - White walls: clean, bright, neutral
   - Tiles/stone: crisp and defined
   - Fabrics/textiles: soft and inviting

6. CONTRAST & CLARITY:
   - Apply medium S-curve for depth and dimension
   - Clarity +15 to +20 on architectural elements (edges, lines, textures)
   - Micro-contrast on materials for tactile quality

7. NOISE REDUCTION: Full denoise — the result must look shot on a Sony A7R V or Hasselblad. Zero grain, especially in shadow areas.

8. LENS CORRECTION: Straighten all vertical lines. Correct wide-angle barrel distortion. The image must have perfect architectural geometry.

9. FINAL MOOD: Bright, warm, aspirational, premium. The image must make someone want to book immediately.

━━━━ CRITICAL RULE ━━━━
A slightly over-bright image is ALWAYS better than a dark or dull one.
If in doubt, add more light. Nodalview images are consistently brighter than what most people would expect — and that's exactly what sells.

Output: one single photorealistic image, ultra-high quality, same aspect ratio as the original.`;

const STYLE_ADDONS: Record<string, string> = {
  standard: "",
  luxury: `\n\nADDITIONAL STYLE — LUXURY: Add a subtle warm luxury glow. Wood should look rich and expensive. Enhance the feeling of premium craftsmanship. Think Architectural Digest or Côte d'Azur villa listing.`,
  minimal: `\n\nADDITIONAL STYLE — MINIMAL: Emphasize clean lines, white spaces, and contemporary aesthetics. Slightly cooler color temperature for a fresh, modern feel. Think Scandinavian design magazine.`,
  coastal: `\n\nADDITIONAL STYLE — COASTAL/EXTERIOR: Enhance sky blues and vegetation greens. Pool/sea water should look turquoise and inviting. Warm Mediterranean light on stone and terrace surfaces. Think luxury seaside property listing.`,
};

function buildPrompt(style: string, homeStaging: boolean): string {
  let prompt = NODALVIEW_PROMPT;
  prompt += STYLE_ADDONS[style] || "";
  
  if (homeStaging) {
    prompt += `\n\nHOME STAGING (ENABLED): You may add 1-3 tiny lifestyle elements on existing flat surfaces ONLY (table, bed, countertop). Examples: fruit bowl, coffee cups, folded towel, small plant. They must match the existing lighting and style. DO NOT move or replace anything — only add tiny touches.`;
  } else {
    prompt += `\n\nHOME STAGING: DISABLED. Add ZERO new objects. Pure photo enhancement only.`;
  }

  return prompt;
}

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

function createImageBlob(imageBase64: string) {
  const base64Match = imageBase64.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!base64Match) throw new Error("Invalid image format");

  const imageFormat = base64Match[1] === "jpg" ? "jpeg" : base64Match[1];
  const binaryString = atob(base64Match[2]);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  return {
    imageFormat,
    imageBlob: new Blob([bytes], { type: `image/${imageFormat}` }),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, style = "standard", homeStaging = false } = await req.json();
    if (!imageBase64) return jsonResponse({ error: "imageBase64 required" }, 400);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const { imageBlob, imageFormat } = createImageBlob(imageBase64);
    const editPrompt = buildPrompt(style, Boolean(homeStaging));

    // Single-pass edit with GPT-image-1
    const formData = new FormData();
    formData.append("image", imageBlob, `photo.${imageFormat === "jpeg" ? "jpg" : imageFormat}`);
    formData.append("prompt", editPrompt);
    formData.append("model", "gpt-image-1");
    formData.append("size", "auto");
    formData.append("quality", "high");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      if (response.status === 429) throw new HttpError(429, "Trop de requêtes, réessayez dans un moment.");
      if (response.status === 402 || response.status === 403) throw new HttpError(402, "Crédits OpenAI épuisés.");
      throw new Error(`OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const generatedB64 = data.data?.[0]?.b64_json;
    if (!generatedB64) throw new Error("No image generated");

    return jsonResponse({ optimizedImageUrl: `data:image/png;base64,${generatedB64}` });
  } catch (e) {
    console.error("photo-optimizer-generate error:", e);
    if (e instanceof HttpError) return jsonResponse({ error: e.message }, e.status);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

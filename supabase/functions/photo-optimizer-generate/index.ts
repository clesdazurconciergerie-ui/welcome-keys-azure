import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  standard: "Natural, professional real estate photography style.",
  luxury: "Luxury, high-end real estate style. Rich warm tones on wood, premium craftsmanship feel. Think Architectural Digest.",
  minimal: "Clean Scandinavian minimal style. Slightly cooler tones, emphasize white spaces and clean lines.",
  coastal: "Mediterranean coastal style. Enhance blues, turquoise water, warm stone textures. Seaside luxury feel.",
};

function buildPrompt(style: string, homeStaging: boolean): string {
  const styleNote = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS.standard;
  
  const stagingNote = homeStaging
    ? "You may add 1-3 small lifestyle props on flat surfaces (coffee cup, small plant, folded towel) matching the existing style and lighting."
    : "Do NOT add, remove, or move any object. Pure enhancement only.";

  return `You are a Nodalview-level real estate photo editor. Transform this property photo into a premium listing image for Airbnb Plus or luxury real estate agencies.

CRITICAL ENHANCEMENTS TO APPLY:
1. BRIGHTNESS: Make the interior extremely bright and airy — flood with natural light. Push shadows +80-100%. Dark corners are unacceptable.
2. WHITE BALANCE: Neutralize yellow/orange indoor lighting casts. Set to clean daylight (5500-6200K). Whites must look white.
3. WINDOW RECOVERY: If windows are visible, balance exposure so exterior (sky, garden) is visible — not blown out white. This is the Nodalview signature.
4. COLORS: Boost vibrance +30-40%. Wood = warm amber. Tiles = crisp. Fabrics = soft and inviting. Colors must pop naturally.
5. NOISE: Complete denoise — zero grain, especially in shadows. Clean as a medium format camera.
6. LENS CORRECTION: Straighten vertical lines. Fix wide-angle barrel distortion. Perfect architectural geometry.
7. CONTRAST: Medium S-curve for depth. Clarity +15-20% on architectural elements.

STYLE: ${styleNote}

RULES:
- Do NOT change room layout, perspective, or composition
- Do NOT alter architecture or furniture placement
- ${stagingNote}
- A slightly over-bright result is ALWAYS better than dark/dull
- The result must look like a professional Nodalview/Airbnb Plus listing photo

Output one photorealistic enhanced image, same composition, ultra-high quality.`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, style = "standard", homeStaging = false } = await req.json();
    if (!imageBase64) return jsonResponse({ error: "imageBase64 required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return jsonResponse({ error: "API key not configured" }, 500);
    }

    const editPrompt = buildPrompt(style, Boolean(homeStaging));

    console.log("Calling Lovable AI Gateway for image editing, style:", style, "homeStaging:", homeStaging);

    // Use Lovable AI Gateway with Gemini image editing
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: editPrompt },
              {
                type: "image_url",
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) return jsonResponse({ error: "Trop de requêtes, réessayez dans un moment." }, 429);
      if (response.status === 402) return jsonResponse({ error: "Crédits IA épuisés. Ajoutez des crédits dans Settings > Workspace > Usage." }, 402);
      return jsonResponse({ error: `AI Gateway error: ${response.status}` }, 500);
    }

    const data = await response.json();
    console.log("AI Gateway response received, checking for image...");

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      return jsonResponse({ error: "Aucune image générée par l'IA" }, 500);
    }

    console.log("Image generated successfully, returning to client");
    return jsonResponse({ optimizedImageUrl: imageUrl });
  } catch (e) {
    console.error("photo-optimizer-generate error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

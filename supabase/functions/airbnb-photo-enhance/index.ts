import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AIRBNB_PROMPT = `You are a professional real estate photographer with 50 years of experience shooting luxury properties for high-end magazines and premium rental platforms. Your mission: transform this photo into a magazine-quality shot ready to be published directly on an Airbnb listing.

CRITICAL RULES — READ FIRST:
- The result MUST look 100% photorealistic. No AI artifacts, no painterly effects, no surreal lighting, no plastic textures, no dream-like atmosphere.
- Every element must look like it was physically present in the room during the shoot. Nothing should look added, fake, or digitally generated.
- The final image must be indistinguishable from a real professional photograph taken on location with a high-end camera.
- Do NOT make it look like an illustration, a render, or an AI image. If it doesn't look like a real photo, it has failed.

AIRBNB FORMAT — MANDATORY OUTPUT SPECS:
- Aspect ratio: 3:2 (landscape/horizontal orientation — NEVER vertical)
- Landscape only — wide, horizontal framing that showcases the full room
- Composition: wide-angle perspective (equivalent to 16-35mm lens)
- No black borders, no white margins, no watermarks

LIGHTING & ATMOSPHERE
- Boost natural light: brighten windows, enhance sunbeams, warm up ambient light to a golden-hour feel (~4500K)
- Balance exposure: no blown-out windows, no dark corners
- Add soft, warm luminosity that feels natural and inviting
- Enhance shadows subtly for depth — everything must remain believable

BEDS (if present)
- Make beds perfectly: crisp hotel-style with tight military corners
- Fluffy, plumped pillows arranged symmetrically
- Smooth out all wrinkles from sheets and duvet
- Add a neatly folded throw blanket at the foot of the bed
- Linen should look premium but physically real — no CGI fabric

TABLES & SURFACES (if present)
- Style dining or coffee tables: add a continental breakfast setup (croissants, coffee cup, orange juice, small vase with fresh flowers)
- All items must cast realistic shadows and fit the existing lighting
- Clear all clutter, cords, personal items, trash

DEEP CLEAN & DECLUTTER — ZERO TOLERANCE FOR MESS. Remove without exception: clothes, suitcases, bags, shoes, hangers, cables, chargers, cords, plugs, trash bins, toilet brushes, cleaning products, mops, brooms, dirty dishes, used glasses, leftover food, takeaway packaging, toiletries, shampoo bottles, soap bars, toothbrushes, razors, remote controls, newspapers, magazines, receipts, paperwork, toys, sports equipment, random floor objects, anything on top of the toilet, sink edge or bathtub rim, stains on walls/floors/ceilings/furniture.

After removing, replace with intention: empty surfaces → ONE tasteful decorative object (candle, small plant, book, or vase), empty corners → floor plant or floor lamp if it fits the style, bare bathroom counter → one neat set of white towels folded spa-style, naked bed → full hotel-style bedding. Every replacement must look physically real and match the room's lighting.

STYLING DETAILS
- Add a small bouquet of fresh flowers where appropriate
- Towels folded spa-style if bathroom is visible
- Open curtains/blinds fully to maximize light
- If outdoor view is visible: enhance sky naturally (soft blue, light clouds)

POST-PROCESSING (realistic photography grade)
- Slight HDR for depth — subtle, not HDR-overdone
- Vibrance +15, Saturation +10, Clarity +10
- Correct perspective distortion (straight vertical lines)
- Color grade: warm whites, rich wood tones, clean neutrals
- Style reference: Canon EOS R5 + 16-35mm f/2.8L on tripod, professional Lightroom edit

FINAL OBJECTIVE:
A single, stunning, print-ready photograph that makes a potential guest immediately want to book. It must look like a real photo taken by a professional photographer — not AI-generated, not a render. Upload-ready for Airbnb in 3:2 landscape format.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip data URL prefix if present
    const rawBase64 = imageBase64.startsWith("data:")
      ? imageBase64.split(",")[1]
      : imageBase64;
    const type = mimeType || "image/png";

    // Decode base64 -> bytes
    const binary = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
    const imageBlob = new Blob([binary], { type });

    // OpenAI images/edits (gpt-image-1) — supports editing/transforming an input image
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("image", imageBlob, "input.png");
    form.append("prompt", AIRBNB_PROMPT);
    form.append("size", "1536x1024"); // 3:2 landscape
    form.append("quality", "high");
    form.append("n", "1");

    const oaResp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });

    if (!oaResp.ok) {
      const body = await oaResp.text();
      console.error("OpenAI error", oaResp.status, body);
      return new Response(
        JSON.stringify({ error: "OpenAI failed", status: oaResp.status, details: body }),
        { status: oaResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await oaResp.json();
    const b64: string | undefined = payload?.data?.[0]?.b64_json;

    if (!b64) {
      console.error("No image returned", JSON.stringify(payload).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Model did not return an image", raw: payload }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ imageDataUrl: `data:image/png;base64,${b64}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("airbnb-photo-enhance error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

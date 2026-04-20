// MODULE 6 — Revenue AI : analyse historique + suggestions tarifaires Gemini
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userId = userData.user.id;

    const { property_id, horizon_days = 60 } = await req.json();
    if (!property_id) {
      return new Response(JSON.stringify({ error: "property_id required" }), { status: 400, headers: corsHeaders });
    }

    // Fetch historical bookings (last 12 months)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("check_in, check_out, gross_amount, source_platform")
      .eq("property_id", property_id)
      .gte("check_in", oneYearAgo.toISOString().slice(0, 10))
      .order("check_in", { ascending: true });

    if (!bookings || bookings.length < 3) {
      return new Response(
        JSON.stringify({ error: "Pas assez d'historique (minimum 3 réservations)" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get property
    const { data: prop } = await supabase
      .from("properties")
      .select("name, city, base_price_per_night")
      .eq("id", property_id)
      .single();

    // Build summary stats
    const nights = bookings.map((b: any) => {
      const n = Math.max(1, Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000));
      return { ...b, nights: n, adr: Number(b.gross_amount ?? 0) / n };
    });
    const adrValues = nights.map((b) => b.adr).filter((v) => v > 0);
    const avgAdr = adrValues.reduce((s, v) => s + v, 0) / Math.max(adrValues.length, 1);

    // Group by month
    const byMonth: Record<string, number[]> = {};
    for (const b of nights) {
      const m = b.check_in.slice(0, 7);
      if (!byMonth[m]) byMonth[m] = [];
      byMonth[m].push(b.adr);
    }

    const monthlySummary = Object.entries(byMonth)
      .map(([m, vals]) => `${m}: ${vals.length} séjours, ADR moyen ${(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(0)}€`)
      .join("\n");

    // Call Gemini via Lovable AI Gateway
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Tu es un revenue manager Airbnb expert pour un bien à ${prop?.city ?? "France"}.

Bien: ${prop?.name ?? "—"}
Prix de base actuel: ${prop?.base_price_per_night ?? "non défini"}€/nuit
ADR historique moyen: ${avgAdr.toFixed(0)}€
Nombre total de réservations 12 derniers mois: ${bookings.length}

Performance par mois:
${monthlySummary}

Génère 3 à 5 suggestions tarifaires concrètes pour les ${horizon_days} prochains jours.
Format JSON strict:
{
  "suggestions": [
    {
      "period": "ex: Été (juillet-août)",
      "current_estimate": 120,
      "suggested": 165,
      "delta_percent": 37,
      "reason": "Forte demande historique constatée + saison haute"
    }
  ],
  "summary": "Phrase synthèse de la stratégie recommandée"
}

Réponds UNIQUEMENT avec le JSON, sans markdown.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un expert revenue management. Réponds en JSON strict." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      throw new Error(`AI error ${aiResp.status}: ${txt.slice(0, 200)}`);
    }

    const aiJson = await aiResp.json();
    let content = aiJson.choices?.[0]?.message?.content ?? "{}";
    // Strip eventual markdown
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { suggestions: [], summary: "Erreur parsing IA", raw: content };
    }

    // Save suggestions to DB
    if (parsed.suggestions?.length) {
      const rows = parsed.suggestions.map((s: any) => ({
        user_id: userId,
        property_id,
        suggestion_type: "ai_pricing",
        suggested_value: s.suggested ?? null,
        reasoning: s.reason ?? "",
        period_label: s.period ?? "",
        delta_percent: s.delta_percent ?? null,
        status: "pending",
      }));
      await supabase.from("pricing_suggestions").insert(rows).select();
    }

    return new Response(
      JSON.stringify({
        success: true,
        analyzed: bookings.length,
        avg_adr: Math.round(avgAdr),
        ...parsed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("pricing-ai-suggest error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

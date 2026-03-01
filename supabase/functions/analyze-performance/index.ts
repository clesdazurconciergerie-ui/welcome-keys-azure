import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const body = await req.json();
    const mode = body.mode || "analysis"; // analysis | tasks | both

    // Fetch aggregated data (READ-only)
    const [invoicesRes, expensesRes, bookingsRes, interventionsRes, prospectsRes] = await Promise.all([
      sb.from("invoices").select("total, status, invoice_date, type"),
      sb.from("expenses").select("amount, status, category, expense_date"),
      sb.from("bookings").select("gross_amount, check_in, check_out, source, financial_status"),
      sb.from("cleaning_interventions").select("mission_amount, payment_done, status, scheduled_date, mission_type"),
      sb.from("prospects").select("pipeline_status, estimated_monthly_revenue, warmth, last_contact_date, first_contact_date"),
    ]);

    const snapshot = {
      invoices: invoicesRes.data || [],
      expenses: expensesRes.data || [],
      bookings: bookingsRes.data || [],
      interventions: interventionsRes.data || [],
      prospects: prospectsRes.data || [],
    };

    // Create ai_run
    const { data: run } = await sb.from("ai_runs").insert({
      user_id: user.id,
      type: mode,
      period_start: body.period_start || null,
      period_end: body.period_end || null,
      status: "running",
    }).select().single();

    const runId = run?.id;

    // Build prompt
    const systemPrompt = `Tu es un analyste de performance pour une conciergerie de locations saisonnières. 
Analyse les données fournies et génère:
1. Un résumé exécutif (3-5 phrases)
2. Une liste de points clés (bullets) avec des insights actionnables
3. Si demandé, une liste de tâches prioritaires avec scope, priorité et justification

Réponds TOUJOURS en français. Sois concis et actionnable.
Utilise le tool calling pour structurer ta réponse.`;

    const userPrompt = `Voici les données agrégées de performance:
${JSON.stringify(snapshot, null, 2)}

Mode demandé: ${mode}
Période: ${body.period_start || "tout"} à ${body.period_end || "maintenant"}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "performance_analysis",
          description: "Return structured performance analysis with insights and optional tasks",
          parameters: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Executive summary in French, 3-5 sentences" },
              bullets: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    type: { type: "string", enum: ["positive", "warning", "action", "info"] },
                  },
                  required: ["text", "type"],
                },
              },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    scope: { type: "string", enum: ["finance", "operations", "sales", "listing", "general"] },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    effort: { type: "string", description: "Estimated effort" },
                    impact: { type: "string", description: "Expected impact" },
                  },
                  required: ["title", "description", "scope", "priority"],
                },
              },
            },
            required: ["summary", "bullets"],
          },
        },
      },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "performance_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (runId) {
        await sb.from("ai_runs").update({ status: "error", error: errText }).eq("id", runId);
      }

      const statusCode = aiResponse.status;
      if (statusCode === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (statusCode === 402) {
        return new Response(JSON.stringify({ error: "Crédits AI épuisés. Rechargez votre workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + errText);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback
      analysis = { summary: aiData.choices?.[0]?.message?.content || "Analyse non disponible", bullets: [] };
    }

    // Save insight
    await sb.from("ai_insights").insert({
      user_id: user.id,
      run_id: runId,
      period_start: body.period_start || null,
      period_end: body.period_end || null,
      summary_text: analysis.summary,
      bullets_json: analysis.bullets || [],
    });

    // Save AI-suggested tasks
    if (analysis.tasks && analysis.tasks.length > 0) {
      const taskRows = analysis.tasks.map((t: any) => ({
        user_id: user.id,
        scope: t.scope || "general",
        title: t.title,
        description: `${t.description}${t.effort ? `\n\nEffort: ${t.effort}` : ""}${t.impact ? `\nImpact: ${t.impact}` : ""}`,
        priority: t.priority || "medium",
        status: "draft",
        source: "ai",
        confidence: 0.8,
        run_id: runId,
      }));
      await sb.from("ai_tasks").insert(taskRows);
    }

    // Mark run as completed
    if (runId) {
      await sb.from("ai_runs").update({ status: "completed" }).eq("id", runId);
    }

    return new Response(JSON.stringify({ success: true, summary: analysis.summary, bullets: analysis.bullets, tasks_count: analysis.tasks?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("analyze-performance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

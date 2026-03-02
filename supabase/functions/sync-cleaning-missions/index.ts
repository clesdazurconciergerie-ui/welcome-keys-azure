import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for data operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const propertyFilter = body.property_id || null;
    const windowDays = body.window_days || 31;

    const now = new Date();
    const windowStart = now.toISOString().slice(0, 10);
    const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    console.log(`[sync-cleaning] User ${user.id}, window ${windowStart} → ${windowEnd}, property=${propertyFilter || "all"}`);

    // Fetch bookings
    let query = supabase
      .from("bookings")
      .select(`
        id, user_id, property_id, check_in, check_out, guest_name, price_status,
        property:properties!inner(
          id, name, cleaning_enabled, cleaning_payout_amount,
          cleaning_default_start_time, cleaning_duration_minutes,
          cleaning_lead_time_hours, cleaning_open_mode,
          cleaning_instructions_template
        )
      `)
      .eq("user_id", user.id)
      .gte("check_out", windowStart)
      .lt("check_out", windowEnd);

    if (propertyFilter) {
      query = query.eq("property_id", propertyFilter);
    }

    const { data: bookings, error: bErr } = await query;
    if (bErr) {
      console.error("[sync-cleaning] Fetch error:", bErr);
      return new Response(JSON.stringify({ error: bErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let created = 0, updated = 0, skipped = 0, ignored = 0, errors = 0;

    for (const b of bookings || []) {
      const prop = b.property as any;

      // Skip if cleaning not enabled
      if (!prop?.cleaning_enabled) {
        ignored++;
        continue;
      }

      // Skip canceled
      if (b.price_status === "canceled") {
        ignored++;
        continue;
      }

      const startTime = prop.cleaning_default_start_time || "11:00";
      const leadHours = prop.cleaning_lead_time_hours || 0;
      const durationMin = prop.cleaning_duration_minutes || 120;

      const missionStart = new Date(`${b.check_out}T${startTime}:00`);
      missionStart.setHours(missionStart.getHours() + leadHours);
      const missionEnd = new Date(missionStart.getTime() + durationMin * 60 * 1000);

      const title = `Ménage (check-out) — ${prop.name}`;
      let instructions = prop.cleaning_instructions_template || "";
      if (b.guest_name) {
        instructions += `\n\nVoyageur: ${b.guest_name}`;
      }

      const isOpen = prop.cleaning_open_mode !== false;

      // Check existing
      const { data: existing } = await supabase
        .from("missions")
        .select("id, status")
        .eq("source_type", "booking")
        .eq("source_id", b.id)
        .eq("mission_type", "cleaning_checkout")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (["done", "approved", "confirmed", "assigned"].includes(existing.status)) {
          skipped++;
        } else {
          const { error: upErr } = await supabase
            .from("missions")
            .update({
              start_at: missionStart.toISOString(),
              end_at: missionEnd.toISOString(),
              payout_amount: prop.cleaning_payout_amount || 0,
              instructions,
              title,
            })
            .eq("id", existing.id);
          if (upErr) { errors++; console.error(`[sync-cleaning] Update error:`, upErr); }
          else updated++;
        }
      } else {
        const { error: insErr } = await supabase.from("missions").insert({
          user_id: user.id,
          property_id: b.property_id,
          title,
          mission_type: "cleaning_checkout",
          start_at: missionStart.toISOString(),
          end_at: missionEnd.toISOString(),
          payout_amount: prop.cleaning_payout_amount || 0,
          instructions,
          status: isOpen ? "open" : "draft",
          is_open_to_all: isOpen,
          source_type: "booking",
          source_id: b.id,
        });

        if (insErr) {
          if (insErr.code === "23505") skipped++;
          else { errors++; console.error(`[sync-cleaning] Insert error:`, insErr); }
        } else {
          created++;
        }
      }
    }

    const summary = { created, updated, skipped, ignored, errors, total: bookings?.length || 0, window: { start: windowStart, end: windowEnd } };
    console.log("[sync-cleaning] Result:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[sync-cleaning] Unexpected error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const windowStart = now.toISOString().slice(0, 10); // today
  const windowEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  console.log(`[cleaning-daily] Running for window ${windowStart} → ${windowEnd}`);

  // Fetch all bookings with checkout in window, joined with property cleaning settings
  const { data: bookings, error: bErr } = await supabase
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
    .gte("check_out", windowStart)
    .lt("check_out", windowEnd)
    .neq("price_status", "canceled");

  if (bErr) {
    console.error("[cleaning-daily] Error fetching bookings:", bErr);
    return new Response(JSON.stringify({ error: bErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter only properties with cleaning_enabled
  const eligible = (bookings || []).filter(
    (b: any) => b.property?.cleaning_enabled === true
  );

  console.log(
    `[cleaning-daily] ${bookings?.length || 0} bookings in window, ${eligible.length} eligible`
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const b of eligible) {
    const prop = b.property as any;
    const startTime = prop.cleaning_default_start_time || "11:00";
    const leadHours = prop.cleaning_lead_time_hours || 0;
    const durationMin = prop.cleaning_duration_minutes || 120;

    // Build mission start: checkout date + start time + lead hours
    const missionStart = new Date(`${b.check_out}T${startTime}:00`);
    missionStart.setHours(missionStart.getHours() + leadHours);
    const missionEnd = new Date(
      missionStart.getTime() + durationMin * 60 * 1000
    );

    const title = `Ménage (check-out) — ${prop.name}`;
    let instructions = prop.cleaning_instructions_template || "";
    if (b.guest_name) {
      instructions += `\n\nVoyageur: ${b.guest_name}`;
    }

    const isOpen = prop.cleaning_open_mode !== false;

    // Check if mission already exists
    const { data: existing } = await supabase
      .from("missions")
      .select("id, status")
      .eq("source_type", "booking")
      .eq("source_id", b.id)
      .eq("mission_type", "cleaning_checkout")
      .eq("user_id", b.user_id)
      .maybeSingle();

    if (existing) {
      // Update if not completed
      if (!["done", "approved", "confirmed"].includes(existing.status)) {
        await supabase
          .from("missions")
          .update({
            start_at: missionStart.toISOString(),
            end_at: missionEnd.toISOString(),
            payout_amount: prop.cleaning_payout_amount || 0,
            instructions,
            title,
          })
          .eq("id", existing.id);
        updated++;
      } else {
        skipped++;
      }
    } else {
      // Insert new mission
      const { error: insErr } = await supabase.from("missions").insert({
        user_id: b.user_id,
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
        // Unique constraint conflict = already exists, skip
        if (insErr.code === "23505") {
          skipped++;
        } else {
          console.error(`[cleaning-daily] Insert error for booking ${b.id}:`, insErr);
        }
      } else {
        created++;
      }
    }
  }

  const summary = { created, updated, skipped, total: eligible.length, window: { start: windowStart, end: windowEnd } };
  console.log("[cleaning-daily] Result:", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

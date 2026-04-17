// Daily cron: auto-create entry/exit inspections for today's bookings
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];
    console.log(`[auto-create-inspections] Running for ${today}`);

    // Fetch bookings with check-in OR check-out today (exclude canceled)
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("id, user_id, property_id, check_in, check_out, guest_name")
      .or(`check_in.eq.${today},check_out.eq.${today}`)
      .neq("price_status", "canceled");

    if (bErr) throw bErr;

    let createdEntries = 0;
    let createdExits = 0;
    let skipped = 0;

    for (const b of bookings || []) {
      // ENTRY (check-in today)
      if (b.check_in === today) {
        const { data: existing } = await supabase
          .from("inspections")
          .select("id")
          .eq("booking_id", b.id)
          .eq("inspection_type", "entry")
          .maybeSingle();

        if (existing) {
          skipped++;
        } else {
          const { error: insErr } = await supabase.from("inspections").insert({
            user_id: b.user_id,
            property_id: b.property_id,
            booking_id: b.id,
            inspection_type: "entry",
            inspection_date: today,
            guest_name: b.guest_name || null,
            status: "draft",
          });
          if (insErr) {
            console.error(`Entry inspection failed for booking ${b.id}:`, insErr);
          } else {
            createdEntries++;
          }
        }
      }

      // EXIT (check-out today)
      if (b.check_out === today) {
        const { data: existing } = await supabase
          .from("inspections")
          .select("id")
          .eq("booking_id", b.id)
          .eq("inspection_type", "exit")
          .maybeSingle();

        if (existing) {
          skipped++;
        } else {
          const { error: insErr } = await supabase.from("inspections").insert({
            user_id: b.user_id,
            property_id: b.property_id,
            booking_id: b.id,
            inspection_type: "exit",
            inspection_date: today,
            guest_name: b.guest_name || null,
            status: "draft",
          });
          if (insErr) {
            console.error(`Exit inspection failed for booking ${b.id}:`, insErr);
          } else {
            createdExits++;
          }
        }
      }
    }

    // Also process iCal calendar_events (which may not have a corresponding bookings row)
    const { data: events, error: eErr } = await supabase
      .from("calendar_events")
      .select("id, user_id, property_id, start_date, end_date, guest_name")
      .or(`start_date.eq.${today},end_date.eq.${today}`)
      .neq("status", "cancelled");

    if (eErr) console.error("[auto-create-inspections] calendar_events fetch:", eErr);

    for (const e of events || []) {
      // ENTRY (check-in today)
      if (e.start_date === today) {
        // Skip if a booking with same dates already produced an inspection
        const { data: existing } = await supabase
          .from("inspections")
          .select("id")
          .eq("property_id", e.property_id)
          .eq("inspection_type", "entry")
          .eq("inspection_date", today)
          .maybeSingle();

        if (existing) {
          skipped++;
        } else {
          const { error: insErr } = await supabase.from("inspections").insert({
            user_id: e.user_id,
            property_id: e.property_id,
            booking_id: null,
            inspection_type: "entry",
            inspection_date: today,
            guest_name: e.guest_name || null,
            status: "draft",
          });
          if (!insErr) createdEntries++;
        }
      }

      // EXIT
      if (e.end_date === today) {
        const { data: existing } = await supabase
          .from("inspections")
          .select("id")
          .eq("property_id", e.property_id)
          .eq("inspection_type", "exit")
          .eq("inspection_date", today)
          .maybeSingle();

        if (existing) {
          skipped++;
        } else {
          const { error: insErr } = await supabase.from("inspections").insert({
            user_id: e.user_id,
            property_id: e.property_id,
            booking_id: null,
            inspection_type: "exit",
            inspection_date: today,
            guest_name: e.guest_name || null,
            status: "draft",
          });
          if (!insErr) createdExits++;
        }
      }
    }

    const summary = {
      success: true,
      date: today,
      created_entries: createdEntries,
      created_exits: createdExits,
      skipped_existing: skipped,
      bookings_scanned: bookings?.length || 0,
      events_scanned: events?.length || 0,
    };
    console.log("[auto-create-inspections] Done", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[auto-create-inspections] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || String(err) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IgnoredItem {
  id: string;
  property_name: string;
  start_date: string;
  end_date: string;
  event_type: string | null;
  status: string;
  platform: string;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
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

    // ── Step 1: Fetch ALL calendar_events in window (the real source of truth) ──
    let query = supabase
      .from("calendar_events")
      .select(`
        id, user_id, property_id, start_date, end_date, event_type, status, 
        platform, guest_name, summary
      `)
      .eq("user_id", user.id)
      .gte("end_date", windowStart)
      .lt("end_date", windowEnd);

    if (propertyFilter) {
      query = query.eq("property_id", propertyFilter);
    }

    const { data: events, error: evErr } = await query;
    if (evErr) {
      console.error("[sync-cleaning] Fetch calendar_events error:", evErr);
      return new Response(JSON.stringify({ error: evErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalFound = events?.length || 0;
    console.log(`[sync-cleaning] calendar_events found: ${totalFound}`);

    // ── Step 2: Fetch properties with cleaning settings ──
    const propertyIds = [...new Set((events || []).map(e => e.property_id))];
    let propertiesMap: Record<string, any> = {};

    if (propertyIds.length > 0) {
      const { data: props } = await supabase
        .from("properties")
        .select("id, name, cleaning_enabled, cleaning_payout_amount, cleaning_default_start_time, cleaning_duration_minutes, cleaning_lead_time_hours, cleaning_open_mode, cleaning_instructions_template")
        .in("id", propertyIds);
      
      for (const p of props || []) {
        propertiesMap[p.id] = p;
      }
    }

    // ── Step 3: Process each event ──
    let created = 0, updated = 0, skipped = 0, ignored = 0, errors = 0;
    const ignoredItems: IgnoredItem[] = [];
    const errorsList: string[] = [];
    const newlyCreatedMissions: { id: string; property_id: string; title: string; start_at: string; payout_amount: number; instructions: string }[] = [];

    for (const ev of events || []) {
      const prop = propertiesMap[ev.property_id];
      const propName = prop?.name || ev.property_id;

      // Filter: only reservations (not manual_block, not unknown)
      if (ev.event_type !== "reservation") {
        ignored++;
        ignoredItems.push({
          id: ev.id,
          property_name: propName,
          start_date: ev.start_date,
          end_date: ev.end_date,
          event_type: ev.event_type,
          status: ev.status,
          platform: ev.platform,
          reason: `event_type="${ev.event_type}" (not reservation)`,
        });
        continue;
      }

      // Filter: skip canceled
      if (ev.status === "canceled" || ev.status === "cancelled") {
        ignored++;
        ignoredItems.push({
          id: ev.id,
          property_name: propName,
          start_date: ev.start_date,
          end_date: ev.end_date,
          event_type: ev.event_type,
          status: ev.status,
          platform: ev.platform,
          reason: `status="${ev.status}"`,
        });
        continue;
      }

      // Filter: cleaning not enabled on property
      if (!prop || !prop.cleaning_enabled) {
        ignored++;
        ignoredItems.push({
          id: ev.id,
          property_name: propName,
          start_date: ev.start_date,
          end_date: ev.end_date,
          event_type: ev.event_type,
          status: ev.status,
          platform: ev.platform,
          reason: prop ? "cleaning_enabled=false" : "property not found",
        });
        continue;
      }

      // ── Build mission fields ──
      const startTime = prop.cleaning_default_start_time || "11:00";
      const leadHours = prop.cleaning_lead_time_hours || 0;
      const durationMin = prop.cleaning_duration_minutes || 120;

      const missionStart = new Date(`${ev.end_date}T${startTime}:00`);
      missionStart.setHours(missionStart.getHours() + leadHours);
      const missionEnd = new Date(missionStart.getTime() + durationMin * 60 * 1000);

      const title = `Ménage (check-out) — ${prop.name}`;
      let instructions = prop.cleaning_instructions_template || "";
      const guestInfo = ev.guest_name || ev.summary || "";
      if (guestInfo) {
        instructions += `\n\nVoyageur: ${guestInfo}`;
      }

      const isOpen = prop.cleaning_open_mode !== false;

      // ── Check existing mission ──
      const { data: existing } = await supabase
        .from("missions")
        .select("id, status")
        .eq("source_type", "calendar_event")
        .eq("source_id", ev.id)
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
          if (upErr) {
            errors++;
            errorsList.push(`Update ${existing.id}: ${upErr.message}`);
            console.error(`[sync-cleaning] Update error:`, upErr);
          } else {
            updated++;
          }
        }
      } else {
        const { data: newMission, error: insErr } = await supabase
          .from("missions")
          .insert({
            user_id: user.id,
            property_id: ev.property_id,
            title,
            mission_type: "cleaning_checkout",
            start_at: missionStart.toISOString(),
            end_at: missionEnd.toISOString(),
            payout_amount: prop.cleaning_payout_amount || 0,
            instructions,
            status: isOpen ? "open" : "draft",
            is_open_to_all: isOpen,
            source_type: "calendar_event",
            source_id: ev.id,
          })
          .select("id")
          .single();

        if (insErr) {
          if (insErr.code === "23505") {
            skipped++;
          } else {
            errors++;
            errorsList.push(`Insert for event ${ev.id}: ${insErr.message}`);
            console.error(`[sync-cleaning] Insert error:`, insErr);
          }
        } else {
          created++;
          // Track newly created open missions for email sending
          if (isOpen && newMission) {
            newlyCreatedMissions.push({
              id: newMission.id,
              property_id: ev.property_id,
              title,
              start_at: missionStart.toISOString(),
              payout_amount: prop.cleaning_payout_amount || 0,
              instructions,
            });
          }
        }
      }
    }

    // ── Step 4: Send email notifications for newly created open missions ──
    if (newlyCreatedMissions.length > 0) {
      console.log(`[sync-cleaning] Sending emails for ${newlyCreatedMissions.length} new open missions`);
      
      // Get all active providers for this concierge
      const { data: providers } = await supabase
        .from("service_providers")
        .select("id, email, first_name, last_name")
        .eq("concierge_user_id", user.id)
        .eq("status", "active");

      if (providers && providers.length > 0) {
        for (const mission of newlyCreatedMissions) {
          // Get property details
          const prop = propertiesMap[mission.property_id];
          const missionDate = new Date(mission.start_at).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });

          // Send email to each provider
          for (const provider of providers) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-provider-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceRoleKey}`,
                },
                body: JSON.stringify({
                  provider_email: provider.email,
                  mission_title: mission.title,
                  property_name: prop?.name || 'Logement',
                  mission_date: missionDate,
                  mission_amount: mission.payout_amount || 0,
                  mission_instructions: mission.instructions,
                  mission_id: mission.id,
                  notification_type: 'mission_available'
                })
              });
            } catch (emailErr) {
              console.error(`[sync-cleaning] Failed to send email to ${provider.email}:`, emailErr);
            }
          }
        }
      }
    }

    const eligible = totalFound - ignored;
    const summary = {
      total_events_found: totalFound,
      eligible_count: eligible,
      created,
      updated,
      skipped,
      ignored,
      errors,
      errors_list: errorsList.slice(0, 20),
      ignored_items: ignoredItems.slice(0, 20),
      window: { start: windowStart, end: windowEnd },
    };
    console.log("[sync-cleaning] Result:", JSON.stringify({ created, updated, skipped, ignored, errors, totalFound, eligible }));

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

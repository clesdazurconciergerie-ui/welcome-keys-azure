// MODULE 7 — Edge function publique : génère un feed iCal pour un bien
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeICal(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatICalDate(d: string): string {
  // YYYYMMDD pour DTSTART/DTEND VALUE=DATE
  return d.slice(0, 10).replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 400, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lookup feed
    const { data: feed, error: feedErr } = await supabase
      .from("property_ical_exports")
      .select("id, property_id, is_active, include_blocked, include_manual")
      .eq("feed_token", token)
      .maybeSingle();

    if (feedErr || !feed || !feed.is_active) {
      return new Response("Feed not found or inactive", { status: 404, headers: corsHeaders });
    }

    // Get property name
    const { data: prop } = await supabase
      .from("properties")
      .select("name")
      .eq("id", feed.property_id)
      .single();

    const propName = prop?.name ?? "Property";

    // Get bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, check_in, check_out, guest_name, is_manual, price_status")
      .eq("property_id", feed.property_id)
      .neq("price_status", "canceled");

    // Get calendar events (iCal imports + blocked)
    const { data: events } = await supabase
      .from("calendar_events")
      .select("id, start_date, end_date, summary, event_type, status")
      .eq("property_id", feed.property_id)
      .neq("status", "cancelled");

    // Build VEVENTs
    const vevents: string[] = [];
    const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

    for (const b of bookings ?? []) {
      if (!feed.include_manual && b.is_manual) continue;
      vevents.push(
        [
          "BEGIN:VEVENT",
          `UID:booking-${b.id}@mywelkom.com`,
          `DTSTAMP:${now}`,
          `DTSTART;VALUE=DATE:${formatICalDate(b.check_in)}`,
          `DTEND;VALUE=DATE:${formatICalDate(b.check_out)}`,
          `SUMMARY:${escapeICal(b.guest_name ? `Réservé - ${b.guest_name}` : "Réservé")}`,
          `STATUS:CONFIRMED`,
          "TRANSP:OPAQUE",
          "END:VEVENT",
        ].join("\r\n")
      );
    }

    for (const e of events ?? []) {
      if (!feed.include_blocked && e.event_type === "blocked") continue;
      // Skip events that look like duplicates (already covered by bookings)
      vevents.push(
        [
          "BEGIN:VEVENT",
          `UID:event-${e.id}@mywelkom.com`,
          `DTSTAMP:${now}`,
          `DTSTART;VALUE=DATE:${formatICalDate(e.start_date)}`,
          `DTEND;VALUE=DATE:${formatICalDate(e.end_date)}`,
          `SUMMARY:${escapeICal(e.summary || "Indisponible")}`,
          "STATUS:CONFIRMED",
          "TRANSP:OPAQUE",
          "END:VEVENT",
        ].join("\r\n")
      );
    }

    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyWelkom//Channel Manager//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapeICal(propName)}`,
      ...vevents,
      "END:VCALENDAR",
    ].join("\r\n");

    // Track access (fire-and-forget)
    supabase
      .from("property_ical_exports")
      .update({ last_accessed_at: new Date().toISOString(), access_count: 1 })
      .eq("id", feed.id)
      .then(async () => {
        // increment manuel
        const { data: cur } = await supabase
          .from("property_ical_exports")
          .select("access_count")
          .eq("id", feed.id)
          .single();
        if (cur) {
          await supabase
            .from("property_ical_exports")
            .update({ access_count: (cur.access_count ?? 0) + 1 })
            .eq("id", feed.id);
        }
      });

    return new Response(ical, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${propName.replace(/[^a-z0-9]/gi, "_")}.ics"`,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err: any) {
    console.error("ical-export error", err);
    return new Response(`Error: ${err.message}`, { status: 500, headers: corsHeaders });
  }
});

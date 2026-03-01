import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Non authentifié");

    const { calendar_id } = await req.json();
    if (!calendar_id) throw new Error("calendar_id requis");

    // Fetch the calendar record
    const { data: cal, error: calErr } = await supabase
      .from("ical_calendars")
      .select("*")
      .eq("id", calendar_id)
      .eq("user_id", user.id)
      .single();

    if (calErr || !cal) throw new Error("Calendrier introuvable");

    // Fetch iCal data
    const icalRes = await fetch(cal.url, {
      headers: { "User-Agent": "MyWelcome-Sync/1.0" },
    });
    if (!icalRes.ok) throw new Error(`Erreur HTTP ${icalRes.status} lors du fetch iCal`);

    const icalText = await icalRes.text();

    // Parse iCal events
    const events = parseICalEvents(icalText);

    // Delete existing events for this calendar
    await supabase
      .from("calendar_events")
      .delete()
      .eq("calendar_id", calendar_id);

    // Insert new events
    if (events.length > 0) {
      const rows = events.map((e) => ({
        calendar_id: cal.id,
        property_id: cal.property_id,
        user_id: user.id,
        summary: e.summary || null,
        start_date: e.startDate,
        end_date: e.endDate,
        guest_name: e.guestName || null,
        platform: cal.platform,
        status: "confirmed",
        ical_uid: e.uid || null,
        event_type: e.eventType,
      }));

      const { error: insertErr } = await supabase
        .from("calendar_events")
        .insert(rows);

      if (insertErr) {
        console.error("Insert error:", insertErr);
        throw new Error("Erreur lors de l'insertion des événements");
      }
    }

    // Update sync status
    await supabase
      .from("ical_calendars")
      .update({
        last_synced_at: new Date().toISOString(),
        sync_status: "synced",
      })
      .eq("id", calendar_id);

    return new Response(
      JSON.stringify({ success: true, count: events.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("sync-ical error:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ParsedEvent {
  uid: string;
  summary: string;
  startDate: string;
  endDate: string;
  guestName: string;
  description: string;
  eventType: "reservation" | "manual_block" | "unknown";
}

function parseICalEvents(icalText: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = icalText.replace(/\r\n /g, "").replace(/\r/g, "").split("\n");

  let inEvent = false;
  let current: Partial<ParsedEvent> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
    } else if (line === "END:VEVENT" && inEvent) {
      inEvent = false;
      if (current.startDate && current.endDate) {
        events.push({
          uid: current.uid || "",
          summary: current.summary || "Réservation",
          startDate: current.startDate,
          endDate: current.endDate,
          guestName: current.guestName || "",
          description: current.description || "",
          eventType: classifyEvent(current.summary || "", current.description || "", current.uid || ""),
        });
      }
    } else if (inEvent) {
      if (line.startsWith("UID:")) {
        current.uid = line.substring(4).trim();
      } else if (line.startsWith("SUMMARY:")) {
        const summary = line.substring(8).trim();
        current.summary = summary;
        // Try to extract guest name from Airbnb format: "John D - (HMXXXXXX)"
        const match = summary.match(/^(.+?)\s*[-–]\s*\(/);
        if (match) current.guestName = match[1].trim();
      } else if (line.startsWith("DTSTART")) {
        current.startDate = parseICalDate(line);
      } else if (line.startsWith("DTEND")) {
        current.endDate = parseICalDate(line);
      } else if (line.startsWith("DESCRIPTION:")) {
        const desc = line.substring(12).trim();
        current.description = desc;
        // Some platforms put guest name in description
        if (!current.guestName) {
          if (desc.length > 0 && desc.length < 100) {
            current.guestName = desc;
          }
        }
      }
    }
  }

  return events;
}

function classifyEvent(summary: string, description: string, uid: string): "reservation" | "manual_block" | "unknown" {
  const s = summary.toLowerCase();
  const d = description.toLowerCase();

  // Reservation indicators
  if (
    s.includes("reserved") || s.includes("reservation") || s.includes("réservation") ||
    s.includes("booked") || d.includes("guest") || d.includes("check-in") ||
    d.includes("invité") || d.includes("voyageur") ||
    // Airbnb pattern: "Name - (HMXXXXXX)"
    /^.+\s*[-–]\s*\(/.test(summary)
  ) {
    return "reservation";
  }

  // Manual block indicators
  if (
    s.includes("blocked") || s.includes("not available") || s.includes("bloqué") ||
    s.includes("indisponible") || s.includes("block") || s === "airbnb (not available)"
  ) {
    return "manual_block";
  }

  return "unknown";
}

function parseICalDate(line: string): string {
  // Formats: DTSTART;VALUE=DATE:20240101 or DTSTART:20240101T120000Z
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return "";
  const value = line.substring(colonIdx + 1).trim();

  // Extract date part (YYYYMMDD)
  const dateStr = value.substring(0, 8);
  if (dateStr.length !== 8) return "";

  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

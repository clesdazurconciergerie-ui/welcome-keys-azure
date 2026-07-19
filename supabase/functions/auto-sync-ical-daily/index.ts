// MODULE — Auto-sync iCal quotidien
// Déclenché par pg_cron ou manuellement. Synchronise tous les calendriers actifs
// dont la dernière sync est plus ancienne que sync_frequency_hours.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TIMEOUT_MS = 30_000;
const BATCH_SIZE = 5;

interface SyncResult {
  calendar_id: string;
  status: "success" | "failed" | "timeout";
  events_count?: number;
  error?: string;
  duration_ms: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let triggeredBy: "cron" | "manual" = "cron";
    let onlyCalendarId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        triggeredBy = body?.triggered_by ?? "manual";
        onlyCalendarId = body?.calendar_id ?? null;
      } catch { /* no body */ }
    }

    // 1. Fetch eligible calendars
    let query = supabase
      .from("ical_calendars")
      .select("id, user_id, name, url, platform, last_sync_at, sync_frequency_hours, consecutive_failures")
      .eq("is_active", true);

    if (onlyCalendarId) query = query.eq("id", onlyCalendarId);

    const { data: calendars, error: calErr } = await query;
    if (calErr) throw calErr;

    const now = Date.now();
    const eligible = (calendars ?? []).filter((c: any) => {
      if (onlyCalendarId) return true;
      if (!c.last_sync_at) return true;
      const last = new Date(c.last_sync_at).getTime();
      const freqMs = (c.sync_frequency_hours || 24) * 3600 * 1000;
      return now - last >= freqMs - 60_000;
    });

    console.log(`[auto-sync] ${eligible.length}/${calendars?.length ?? 0} calendars eligible (triggered_by=${triggeredBy})`);

    // 2. Process in batches of BATCH_SIZE
    const results: SyncResult[] = [];
    for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
      const batch = eligible.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((cal: any) => syncOneCalendar(supabase, cal, triggeredBy))
      );
      results.push(...batchResults);
    }

    const summary = {
      total: results.length,
      success: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed" || r.status === "timeout").length,
    };

    return new Response(JSON.stringify({ success: true, summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[auto-sync] fatal error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function syncOneCalendar(
  supabase: any,
  cal: { id: string; user_id: string; url: string; platform: string; name: string },
  triggeredBy: string,
): Promise<SyncResult> {
  const start = Date.now();
  const startedAt = new Date().toISOString();

  // Insert "running" history entry
  const { data: hist } = await supabase
    .from("ical_sync_history")
    .insert({
      user_id: cal.user_id,
      ical_calendar_id: cal.id,
      started_at: startedAt,
      status: "running",
      triggered_by: triggeredBy,
    })
    .select("id")
    .single();

  const histId = hist?.id;

  try {
    // Fetch iCal with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const fetchStart = Date.now();
    const icalRes = await fetch(cal.url, {
      headers: { "User-Agent": "MyWelkom-AutoSync/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - fetchStart;

    if (!icalRes.ok) {
      throw new Error(`HTTP ${icalRes.status}`);
    }

    const icalText = await icalRes.text();
    const events = parseICalEvents(icalText);

    // Get existing events count for delta tracking
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("calendar_id", cal.id);
    const existingCount = existing?.length ?? 0;

    // Replace all events (matches existing sync-ical behavior)
    await supabase.from("calendar_events").delete().eq("calendar_id", cal.id);

    let inserted = 0;
    if (events.length > 0) {
      const rows = events.map((e) => ({
        calendar_id: cal.id,
        property_id: null,
        user_id: cal.user_id,
        summary: e.summary || null,
        start_date: e.startDate,
        end_date: e.endDate,
        guest_name: e.guestName || null,
        platform: cal.platform,
        status: "confirmed",
        ical_uid: e.uid || null,
        event_type: e.eventType,
      }));
      // Pull property_id from calendar
      const { data: calRow } = await supabase
        .from("ical_calendars")
        .select("property_id")
        .eq("id", cal.id)
        .single();
      const propertyId = calRow?.property_id;
      const enrichedRows = rows.map((r) => ({ ...r, property_id: propertyId }));
      const { error: insErr } = await supabase.from("calendar_events").insert(enrichedRows);
      if (insErr) throw insErr;
      inserted = enrichedRows.length;
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - start;

    if (histId) {
      await supabase
        .from("ical_sync_history")
        .update({
          completed_at: completedAt,
          duration_ms: durationMs,
          status: "success",
          events_fetched: events.length,
          events_created: inserted,
          events_deleted: existingCount,
          response_time_ms: responseTimeMs,
          http_status: icalRes.status,
        })
        .eq("id", histId);
    }

    return { calendar_id: cal.id, status: "success", events_count: inserted, duration_ms: durationMs };
  } catch (err) {
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const message = err instanceof Error ? err.message : "Unknown error";

    if (histId) {
      await supabase
        .from("ical_sync_history")
        .update({
          completed_at: completedAt,
          duration_ms: durationMs,
          status: isTimeout ? "timeout" : "failed",
          error_message: message,
          error_code: isTimeout ? "TIMEOUT" : "FETCH_ERROR",
        })
        .eq("id", histId);
    }

    console.error(`[auto-sync] calendar ${cal.id} failed:`, message);
    return {
      calendar_id: cal.id,
      status: isTimeout ? "timeout" : "failed",
      error: message,
      duration_ms: durationMs,
    };
  }
}

interface ParsedEvent {
  uid: string;
  summary: string;
  startDate: string;
  endDate: string;
  guestName: string;
  eventType: string;
}

function parseICalEvents(icalText: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const lines = icalText.replace(/\r\n /g, "").replace(/\r/g, "").split("\n");
  let inEvent = false;
  let cur: Partial<ParsedEvent> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = {};
    } else if (line === "END:VEVENT" && inEvent) {
      inEvent = false;
      if (cur.startDate && cur.endDate) {
        events.push({
          uid: cur.uid || "",
          summary: cur.summary || "Réservation",
          startDate: cur.startDate,
          endDate: cur.endDate,
          guestName: cur.guestName || "",
          eventType: classifyEvent(cur.summary || ""),
        });
      }
    } else if (inEvent) {
      if (line.startsWith("UID:")) cur.uid = line.substring(4).trim();
      else if (line.startsWith("SUMMARY:")) {
        cur.summary = line.substring(8).trim();
        const m = cur.summary.match(/^(.+?)\s*[-–]\s*\(/);
        if (m) cur.guestName = m[1].trim();
      } else if (line.startsWith("DTSTART")) cur.startDate = parseICalDate(line);
      else if (line.startsWith("DTEND")) cur.endDate = parseICalDate(line);
    }
  }
  return events;
}

function classifyEvent(summary: string): string {
  const s = summary.toLowerCase();
  if (s.includes("blocked") || s.includes("not available") || s.includes("bloqué")) return "manual_block";
  return "reservation";
}

function parseICalDate(line: string): string {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return "";
  const value = line.substring(colonIdx + 1).trim();
  const dateStr = value.substring(0, 8);
  if (dateStr.length !== 8) return "";
  return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

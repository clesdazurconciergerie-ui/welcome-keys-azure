import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns the target period for auto-preparation:
// - If we're within the last 7 days of the month, target the CURRENT month
// - Otherwise target the PREVIOUS month
function resolveTargetPeriod(now = new Date()): { period: string; label: string; firstDay: Date; lastDay: Date } {
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const useCurrent = daysLeft <= 7;
  const y = useCurrent ? now.getFullYear() : (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
  const m = useCurrent ? now.getMonth() : (now.getMonth() === 0 ? 11 : now.getMonth() - 1);
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const period = `${y}-${String(m + 1).padStart(2, "0")}`;
  const label = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { period, label, firstDay, lastDay };
}

function nightsInMonth(checkIn: string, checkOut: string, firstDay: Date, lastDay: Date): number {
  const s = new Date(Math.max(new Date(checkIn).getTime(), firstDay.getTime()));
  const e = new Date(Math.min(new Date(checkOut).getTime(), new Date(lastDay).setHours(23, 59, 59, 999)));
  if (e <= s) return 0;
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    let body: { period?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    const now = new Date();
    let period: string, label: string, firstDay: Date, lastDay: Date;
    if (body.period) {
      const [y, m] = body.period.split("-").map(Number);
      firstDay = new Date(y, m - 1, 1);
      lastDay = new Date(y, m, 0);
      period = body.period;
      label = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    } else {
      const t = resolveTargetPeriod(now);
      period = t.period; label = t.label; firstDay = t.firstDay; lastDay = t.lastDay;
    }

    // Active properties owned by this user
    const { data: properties, error: pErr } = await userClient
      .from("properties")
      .select("id, name, city, status")
      .eq("user_id", user.id)
      .neq("status", "archived");
    if (pErr) throw pErr;

    const firstDayStr = firstDay.toISOString().slice(0, 10);
    const lastDayStr = lastDay.toISOString().slice(0, 10);
    const daysInMonth = lastDay.getDate();

    const created: any[] = [];
    const skipped: any[] = [];

    for (const p of properties ?? []) {
      // Skip if a completed report already exists
      const { data: existing } = await userClient
        .from("azurkeys_reports")
        .select("id, status")
        .eq("property_slug", p.id)
        .eq("period", period)
        .maybeSingle();
      if (existing && existing.status === "completed") {
        skipped.push({ property_id: p.id, reason: "completed" });
        continue;
      }

      // Fetch bookings overlapping the month
      const { data: bookings } = await userClient
        .from("bookings")
        .select("check_in, check_out, gross_amount")
        .eq("property_id", p.id)
        .lte("check_in", lastDayStr)
        .gte("check_out", firstDayStr);

      let revenus = 0;
      let nuits = 0;
      let reservations = 0;
      for (const b of bookings ?? []) {
        const n = nightsInMonth(b.check_in, b.check_out, firstDay, lastDay);
        if (n > 0) {
          nuits += n;
          reservations += 1;
          // Prorate gross_amount by the share of nights falling in this month
          const totalNights = Math.max(1, Math.round(
            (new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86400000
          ));
          const gross = Number(b.gross_amount) || 0;
          revenus += (gross * n) / totalNights;
        }
      }

      const occupation = daysInMonth > 0 ? (nuits / daysInMonth) * 100 : 0;
      const prixMoyen = nuits > 0 ? revenus / nuits : 0;

      const mk = (value: number | null) => ({
        value,
        confidence: value !== null ? 1 : 0,
        source: value !== null ? "internal" : "missing",
      });

      const kpi_data = {
        // These come from our internal data — no screenshot needed
        revenus: mk(Math.round(revenus)),
        nuits_reservees: mk(nuits),
        reservations: mk(reservations),
        taux_occupation: mk(Number(occupation.toFixed(1))),
        prix_moyen_nuit: mk(nuits > 0 ? Math.round(prixMoyen) : null),
        // These require Airbnb screenshots — left empty
        impressions: mk(null),
        vues: mk(null),
        taux_clic: mk(null),
        taux_conversion: mk(null),
        annulations: mk(null),
      };

      const payload = {
        property_slug: p.id,
        period,
        period_label: label,
        kpi_data,
        manual_data: {},
        analysis_text: {},
        screenshot_urls: [],
        status: "draft",
        created_by: user.id,
      };

      const { data: row, error: upErr } = await userClient
        .from("azurkeys_reports")
        .upsert(payload, { onConflict: "property_slug,period" })
        .select("id")
        .single();
      if (upErr) {
        skipped.push({ property_id: p.id, reason: upErr.message });
        continue;
      }
      created.push({ property_id: p.id, name: p.name, report_id: row?.id });
    }

    return new Response(
      JSON.stringify({ period, label, created_count: created.length, created, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

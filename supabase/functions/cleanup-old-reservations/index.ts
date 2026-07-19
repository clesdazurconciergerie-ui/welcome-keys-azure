// MODULE — Nettoyage automatique des vieilles réservations
// Supprime bookings et calendar_events dont la fin est passée depuis > RETENTION_DAYS.
// Les blocages propriétaire (platform='owner_block') sont PRÉSERVÉS tant qu'ils sont futurs
// (leurs blocages passés sont aussi purgés).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RETENTION_DAYS = 75;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000).toISOString().slice(0, 10);

  const { data: delBookings, error: e1 } = await supabase
    .from("bookings")
    .delete()
    .lt("check_out", cutoff)
    .select("id");

  const { data: delEvents, error: e2 } = await supabase
    .from("calendar_events")
    .delete()
    .lt("end_date", cutoff)
    .select("id");

  const summary = {
    cutoff,
    bookings_deleted: delBookings?.length ?? 0,
    events_deleted: delEvents?.length ?? 0,
    errors: [e1?.message, e2?.message].filter(Boolean),
  };

  console.log("cleanup-old-reservations", summary);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});

// MODULE 1 — Voyageur Messaging Engine
// Edge function : dispatch toutes les 5 min via cron pg_net.
// Lit guest_scheduled_messages avec status=pending et scheduled_at <= now,
// rend les variables, envoie via Resend (notifications@mywelkom.com),
// met à jour status + sent_at + external_id, retry max 3 fois.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const FROM_ADDRESS = "Welkom <notifications@mywelkom.com>";
const MAX_ATTEMPTS = 3;

interface ScheduledMessage {
  id: string;
  user_id: string;
  booking_id: string | null;
  property_id: string | null;
  template_id: string | null;
  trigger_type: string;
  channel: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  rendered_subject: string | null;
  rendered_body: string | null;
  attempts: number;
}

function renderVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function markdownToHtml(md: string): string {
  // Conversion minimale, suffisante pour les templates voyageurs
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold + italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  html = html.replace(/`(.+?)`/g, "<code style=\"background:#f4f4f5;padding:2px 6px;border-radius:4px;font-family:monospace\">$1</code>");
  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3 style=\"color:#061452;margin:16px 0 8px\">$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2 style=\"color:#061452;margin:20px 0 10px\">$1</h2>");
  // Lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.+<\/li>\n?)+/g, (m) => `<ul style="padding-left:20px;margin:12px 0">${m}</ul>`);
  // Links
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" style="color:#C4A45B;text-decoration:underline">$1</a>');
  // Paragraphs (double-newlines)
  html = html.split(/\n\n+/).map((p) => `<p style="margin:0 0 12px;line-height:1.6">${p.replace(/\n/g, "<br/>")}</p>`).join("");

  return html;
}

function wrapEmail(html: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f7f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2330">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      ${html}
    </div>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:24px">Envoyé par Welkom — votre conciergerie premium</p>
  </div>
</body></html>`;
}

async function buildVariables(
  supabase: ReturnType<typeof createClient>,
  bookingId: string | null,
  propertyId: string | null,
  userId: string,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {};

  if (bookingId) {
    const { data: bk } = await supabase
      .from("bookings")
      .select("guest_name, guest_email, check_in, check_out")
      .eq("id", bookingId)
      .maybeSingle();
    if (bk) {
      const fullName = (bk.guest_name ?? "").trim();
      const [first, ...rest] = fullName.split(/\s+/);
      vars.guest_first_name = first || "";
      vars.guest_last_name = rest.join(" ");
      vars.check_in_date = bk.check_in
        ? new Date(bk.check_in).toLocaleDateString("fr-FR")
        : "";
      vars.check_out_date = bk.check_out
        ? new Date(bk.check_out).toLocaleDateString("fr-FR")
        : "";
    }
  }

  if (propertyId) {
    const { data: prop } = await supabase
      .from("properties")
      .select("name, address, wifi_ssid, wifi_password, parking_info, check_in_time, check_out_time, access_code")
      .eq("id", propertyId)
      .maybeSingle();
    if (prop) {
      vars.property_name = prop.name ?? "";
      vars.property_address = prop.address ?? "";
      vars.wifi_ssid = prop.wifi_ssid ?? "";
      vars.wifi_password = prop.wifi_password ?? "";
      vars.parking_info = prop.parking_info ?? "";
      vars.check_in_time = prop.check_in_time ?? "16:00";
      vars.check_out_time = prop.check_out_time ?? "11:00";
      vars.access_code = prop.access_code ?? "";
    }

    // Booklet URL associé à ce bien
    const { data: booklet } = await supabase
      .from("booklets")
      .select("id, access_code")
      .eq("property_id", propertyId)
      .eq("status", "published")
      .maybeSingle();
    if (booklet?.access_code) {
      vars.booklet_url = `https://mywelkom.com/view/${booklet.access_code}`;
    }
  }

  // Concierge name + phone
  const { data: u } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  if (u) {
    vars.concierge_first_name = u.email?.split("@")[0] ?? "Votre conciergerie";
  }

  return vars;
}

async function processOne(
  supabase: ReturnType<typeof createClient>,
  msg: ScheduledMessage,
): Promise<{ success: boolean; error?: string }> {
  if (msg.channel !== "email") {
    return { success: false, error: "Channel non supporté (email uniquement en v1)" };
  }
  if (!msg.recipient_email) {
    return { success: false, error: "Pas d'email destinataire" };
  }
  if (!msg.rendered_body) {
    return { success: false, error: "Corps de message vide" };
  }

  const vars = await buildVariables(supabase, msg.booking_id, msg.property_id, msg.user_id);
  const subject = renderVariables(msg.rendered_subject ?? "Votre séjour", vars);
  const bodyMd = renderVariables(msg.rendered_body, vars);
  const html = wrapEmail(markdownToHtml(bodyMd));

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [msg.recipient_email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { success: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
  }
  const json = await res.json();
  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from("guest_scheduled_messages")
    .select("id, user_id, booking_id, property_id, template_id, trigger_type, channel, recipient_email, recipient_phone, rendered_subject, rendered_body, attempts")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .lt("attempts", MAX_ATTEMPTS)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = { processed: 0, sent: 0, failed: 0 };

  for (const msg of (pending ?? []) as ScheduledMessage[]) {
    results.processed++;
    const result = await processOne(supabase, msg);
    const newAttempts = msg.attempts + 1;

    if (result.success) {
      results.sent++;
      await supabase
        .from("guest_scheduled_messages")
        .update({ status: "sent", sent_at: new Date().toISOString(), attempts: newAttempts })
        .eq("id", msg.id);
    } else {
      results.failed++;
      const finalStatus = newAttempts >= MAX_ATTEMPTS ? "failed" : "pending";
      await supabase
        .from("guest_scheduled_messages")
        .update({
          status: finalStatus,
          attempts: newAttempts,
          error_message: result.error?.slice(0, 500) ?? "Erreur inconnue",
        })
        .eq("id", msg.id);
    }
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

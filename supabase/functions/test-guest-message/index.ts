// MODULE 1 — Voyageur Messaging Engine
// Edge function "test send" : envoie immédiatement un template à un email donné
// pour permettre au concierge de prévisualiser un message dans sa boîte avant activation.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_ADDRESS = "Welkom <notifications@mywelkom.com>";

function renderVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

function markdownToHtml(md: string): string {
  let html = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code style=\"background:#f4f4f5;padding:2px 6px;border-radius:4px;font-family:monospace\">$1</code>");
  html = html.replace(/^### (.+)$/gm, "<h3 style=\"color:#061452;margin:16px 0 8px\">$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2 style=\"color:#061452;margin:20px 0 10px\">$1</h2>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.+<\/li>\n?)+/g, (m) => `<ul style="padding-left:20px;margin:12px 0">${m}</ul>`);
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" style="color:#C4A45B;text-decoration:underline">$1</a>');
  html = html.split(/\n\n+/).map((p) => `<p style="margin:0 0 12px;line-height:1.6">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  return html;
}

function wrapEmail(html: string, isTest: boolean): string {
  const banner = isTest
    ? '<div style="background:#FEF3C7;color:#92400E;padding:10px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;text-align:center"><strong>📧 EMAIL DE TEST</strong> — Aperçu de votre template</div>'
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f7f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2330">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    ${banner}
    <div style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">${html}</div>
    <p style="text-align:center;font-size:11px;color:#999;margin-top:24px">Welkom — votre conciergerie premium</p>
  </div>
</body></html>`;
}

const SAMPLE_VARS: Record<string, string> = {
  guest_first_name: "Sophie",
  guest_last_name: "Martin",
  property_name: "Villa Azur",
  property_address: "12 Promenade des Anglais, 06000 Nice",
  check_in_date: "15/06/2026",
  check_out_date: "22/06/2026",
  check_in_time: "16:00",
  check_out_time: "11:00",
  access_code: "1234",
  wifi_ssid: "Welkom_VillaAzur",
  wifi_password: "Bienvenue2026",
  parking_info: "Parking privé à droite de l'entrée",
  booklet_url: "https://mywelkom.com/view/DEMO1234",
  concierge_first_name: "Léa",
  concierge_phone: "+33 6 12 34 56 78",
  review_link_airbnb: "https://airbnb.com/reviews/demo",
  review_link_booking: "https://booking.com/reviews/demo",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, body_markdown, recipient_email } = await req.json();
    if (!body_markdown || !recipient_email) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const renderedSubject = renderVariables(subject ?? "Test — Votre séjour à {{property_name}}", SAMPLE_VARS);
    const renderedBodyMd = renderVariables(body_markdown, SAMPLE_VARS);
    const html = wrapEmail(markdownToHtml(renderedBodyMd), true);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipient_email],
        subject: `[TEST] ${renderedSubject}`,
        html,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `Resend ${res.status}`, details: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

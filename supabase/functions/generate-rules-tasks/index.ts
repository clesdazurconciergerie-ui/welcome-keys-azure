import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const tasks: any[] = [];
    const now = new Date();

    // Rule 1: Overdue invoices -> follow-up tasks
    const { data: overdueInvoices } = await sb
      .from("invoices")
      .select("id, invoice_number, total, due_date, owner_id")
      .in("status", ["sent", "overdue"]);

    for (const inv of (overdueInvoices || [])) {
      if (inv.due_date && new Date(inv.due_date) < now) {
        tasks.push({
          user_id: user.id,
          scope: "finance",
          title: `Relancer facture ${inv.invoice_number}`,
          description: `La facture ${inv.invoice_number} de ${inv.total}€ est en retard de paiement (échéance: ${inv.due_date}).`,
          priority: "high",
          status: "todo",
          source: "rules",
          related_type: "invoice",
          related_id: inv.id,
        });
      }
    }

    // Rule 2: Unpaid vendor payments > 14 days
    const { data: unpaidVP } = await sb
      .from("vendor_payments")
      .select("id, description, amount, date")
      .eq("status", "to_pay");

    for (const vp of (unpaidVP || [])) {
      const daysSince = (now.getTime() - new Date(vp.date).getTime()) / 86400000;
      if (daysSince > 14) {
        tasks.push({
          user_id: user.id,
          scope: "finance",
          title: `Payer prestataire: ${vp.description}`,
          description: `Paiement de ${vp.amount}€ en attente depuis ${Math.round(daysSince)} jours.`,
          priority: daysSince > 30 ? "high" : "medium",
          status: "todo",
          source: "rules",
          related_type: "vendor_payment",
          related_id: vp.id,
        });
      }
    }

    // Rule 3: Hot leads without recent contact (>48h)
    const { data: hotLeads } = await sb
      .from("prospects")
      .select("id, first_name, last_name, warmth, last_contact_date, pipeline_status")
      .in("warmth", ["hot", "warm"])
      .not("pipeline_status", "in", '("signed","lost")');

    for (const lead of (hotLeads || [])) {
      const lastContact = lead.last_contact_date ? new Date(lead.last_contact_date) : null;
      const hoursSince = lastContact ? (now.getTime() - lastContact.getTime()) / 3600000 : 999;
      if (hoursSince > 48) {
        tasks.push({
          user_id: user.id,
          scope: "sales",
          title: `Relancer ${lead.first_name} ${lead.last_name}`,
          description: `Lead ${lead.warmth === "hot" ? "🔥 chaud" : "🌤️ tiède"} sans contact depuis ${Math.round(hoursSince / 24)} jours.`,
          priority: lead.warmth === "hot" ? "high" : "medium",
          status: "todo",
          source: "rules",
          related_type: "prospect",
          related_id: lead.id,
        });
      }
    }

    // Rule 4: Leads interested+ without proposal
    const { data: noProposal } = await sb
      .from("prospects")
      .select("id, first_name, last_name, pipeline_status")
      .in("pipeline_status", ["interested", "meeting_scheduled"]);

    for (const lead of (noProposal || [])) {
      tasks.push({
        user_id: user.id,
        scope: "sales",
        title: `Envoyer proposition à ${lead.first_name} ${lead.last_name}`,
        description: `Le prospect est au stade "${lead.pipeline_status}" mais n'a pas encore reçu de proposition.`,
        priority: "medium",
        status: "todo",
        source: "rules",
        related_type: "prospect",
        related_id: lead.id,
      });
    }

    // Deduplicate: don't insert tasks that already exist (same related_id + source=rules + status != done)
    const existingRelatedIds = new Set<string>();
    if (tasks.length > 0) {
      const { data: existing } = await sb
        .from("ai_tasks")
        .select("related_id")
        .eq("source", "rules")
        .neq("status", "done");
      for (const e of (existing || [])) {
        if (e.related_id) existingRelatedIds.add(e.related_id);
      }
    }

    const newTasks = tasks.filter(t => !t.related_id || !existingRelatedIds.has(t.related_id));

    if (newTasks.length > 0) {
      await sb.from("ai_tasks").insert(newTasks);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      generated: newTasks.length, 
      skipped: tasks.length - newTasks.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-rules-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

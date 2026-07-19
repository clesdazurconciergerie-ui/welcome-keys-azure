// MODULE — Envoie le PDF d'état des lieux par email au(x) propriétaire(s)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TYPE_LABELS: Record<string, string> = {
  entry: "État d'entrée",
  exit: "État de sortie",
  inventory: "Inventaire",
  maintenance: "Visite maintenance",
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquant');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non autorisé' }, 401);

    const anon = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user } } = await anon.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return json({ error: 'Non autorisé' }, 401);

    const { inspection_id, override_email } = await req.json();
    if (!inspection_id) return json({ error: 'inspection_id manquant' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch inspection + property
    const { data: insp, error: iErr } = await admin
      .from('property_inspections')
      .select('id, property_id, official_date, inspection_type, report_pdf_url, guest_name, user_id, property:property_id(name)')
      .eq('id', inspection_id)
      .single();
    if (iErr || !insp) return json({ error: 'Inspection introuvable' }, 404);
    if (insp.user_id !== user.id) {
      // Allow super admins via user_roles
      const { data: role } = await admin
        .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle();
      if (!role) return json({ error: 'Interdit' }, 403);
    }
    if (!insp.report_pdf_url) return json({ error: 'PDF non généré. Génère-le d\'abord puis renvoie.' }, 400);

    // Determine recipients
    let recipients: string[] = [];
    if (override_email) {
      recipients = [override_email];
    } else {
      const { data: ownerLinks } = await admin
        .from('owner_properties')
        .select('owner:owner_id(email)')
        .eq('property_id', insp.property_id);
      recipients = (ownerLinks ?? [])
        .map((r: any) => r.owner?.email)
        .filter((e: any): e is string => !!e);
    }
    if (recipients.length === 0) return json({ error: 'Aucun destinataire (aucun propriétaire lié au bien).' }, 400);

    // Download PDF from storage — the report_pdf_url is a signed URL
    const pdfResp = await fetch(insp.report_pdf_url);
    if (!pdfResp.ok) return json({ error: 'Impossible de récupérer le PDF' }, 500);
    const pdfBuf = new Uint8Array(await pdfResp.arrayBuffer());
    // Convert to base64 in chunks (avoid stack overflow on large files)
    let binary = '';
    for (let i = 0; i < pdfBuf.length; i += 0x8000) {
      binary += String.fromCharCode(...pdfBuf.subarray(i, i + 0x8000));
    }
    const pdfBase64 = btoa(binary);

    const label = TYPE_LABELS[insp.inspection_type] ?? insp.inspection_type;
    const dateFR = new Date(insp.official_date).toLocaleDateString('fr-FR');
    const propertyName = (insp as any).property?.name ?? 'votre bien';
    const filename = `EDL-${propertyName.replace(/\s+/g, '-')}-${insp.official_date}.pdf`;

    const html = `
      <div style="font-family:Georgia,serif;color:#09090B;background:#FAFAFA;padding:32px;max-width:600px;margin:auto;">
        <h1 style="font-family:'Cinzel',serif;font-size:22px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 8px;">Azurkeys Properties</h1>
        <hr style="border:none;border-top:1px solid #09090B;margin:16px 0;" />
        <p style="font-size:16px;line-height:1.6;">Bonjour,</p>
        <p style="font-size:15px;line-height:1.6;">
          Vous trouverez ci-joint le rapport <strong>${label}</strong> de votre bien
          <strong>${escapeHtml(propertyName)}</strong>, daté du <strong>${dateFR}</strong>.
        </p>
        ${insp.guest_name ? `<p style="font-size:14px;color:#555;">Voyageur : ${escapeHtml(insp.guest_name)}</p>` : ''}
        <p style="font-size:14px;line-height:1.6;margin-top:24px;">
          Ce document est signé numériquement par les deux parties et fait foi de l'état constaté.
        </p>
        <hr style="border:none;border-top:1px solid #09090B;margin:24px 0;" />
        <p style="font-size:12px;color:#666;">Azurkeys Properties · Conciergerie Nice & Côte d'Azur</p>
      </div>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Azurkeys Properties <no-reply@mywelkom.com>',
        to: recipients,
        subject: `${label} · ${propertyName} · ${dateFR}`,
        html,
        attachments: [{ filename, content: pdfBase64 }],
      }),
    });
    if (!emailRes.ok) {
      const txt = await emailRes.text();
      return json({ error: 'Envoi email échoué', details: txt }, 502);
    }

    await admin.from('property_inspections').update({
      report_sent_at: new Date().toISOString(),
      report_sent_to: recipients,
    }).eq('id', inspection_id);

    return json({ success: true, recipients });
  } catch (e: any) {
    return json({ error: e.message ?? 'Erreur inattendue' }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

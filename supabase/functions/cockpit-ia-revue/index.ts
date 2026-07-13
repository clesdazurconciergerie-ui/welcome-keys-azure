import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Tu es le consultant stratégique de Noa (Azur Keys Properties). Tu produis la revue hebdomadaire : un bilan lucide (5 lignes max, franc, ni flatterie ni fatalisme), 3 focus pour la semaine à venir (projet_ids existants OU noms de suggestions courtes), et une alerte UNIQUEMENT si un vrai risque est visible (stagnation, étoile polaire off-track, surcharge). Sinon alerte = null. Réponds UNIQUEMENT en JSON.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    bilan: { type: "string" },
    focus_semaine: { type: "array", maxItems: 3, items: { type: "string" } },
    alerte: { type: ["string", "null"] },
  },
  required: ["bilan", "focus_semaine", "alerte"],
};

async function callOpenAI(apiKey: string, payload: any) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'revue_hebdo', strict: true, schema: SCHEMA } },
      temperature: 0.5,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing');
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error('Not authenticated');

    const now = new Date();
    const day = now.getUTCDay(); // 0=dim
    const semaineDebut = new Date(now);
    semaineDebut.setUTCDate(now.getUTCDate() - ((day + 6) % 7)); // lundi
    const semaineISO = semaineDebut.toISOString().slice(0, 10);
    const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [{ data: projets }, { data: actions }, { data: etoile }] = await Promise.all([
      supabase.from('projets').select('id, nom, statut, resultat, temps_reel, a_refaire, is_backlog, score_roi_effort, date_validation'),
      supabase.from('actions').select('id, projet_id, texte, fait, date').gte('date', cutoff),
      supabase.from('etoile_polaire').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const payload = {
      date_du_jour: now.toISOString().slice(0, 10),
      semaine_debut: semaineISO,
      etoile_polaire: etoile,
      projets_actifs: (projets || []).filter((p: any) => !p.is_backlog && (p.statut === 'en_cours' || p.statut === 'a_faire')),
      projets_termines_recents: (projets || []).filter((p: any) => p.statut === 'fait' && p.date_validation && p.date_validation > cutoff),
      actions_faites_semaine: (actions || []).filter((a: any) => a.fait),
      backlog_top: (projets || []).filter((p: any) => p.is_backlog).sort((a: any, b: any) => (b.score_roi_effort || 0) - (a.score_roi_effort || 0)).slice(0, 5),
    };

    let content: any;
    try {
      content = await callOpenAI(OPENAI_API_KEY, payload);
    } catch (_e) {
      content = await callOpenAI(OPENAI_API_KEY, payload);
    }

    const { data: inserted } = await supabase.from('revues_hebdo').insert({
      user_id: user.id,
      semaine_debut: semaineISO,
      bilan: content.bilan,
      focus_semaine: content.focus_semaine,
      alerte: content.alerte,
      contenu: payload,
    }).select('*').single();

    return new Response(JSON.stringify(inserted || content), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Revue impossible" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

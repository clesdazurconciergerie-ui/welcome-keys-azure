import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Tu es le consultant Pareto de Noa (Azur Keys Properties). Pour chaque idée soumise, tu attribues un score ROI/effort de 1 à 10 (10 = pépite du top 20%) et tu justifies en UNE phrase courte. Sois honnête : la plupart des idées valent 4-6, très peu valent 9-10. Réponds UNIQUEMENT en JSON.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          score_roi_effort: { type: "integer", minimum: 1, maximum: 10 },
          justification_pareto: { type: "string" },
        },
        required: ["id", "score_roi_effort", "justification_pareto"],
      },
    },
  },
  required: ["scores"],
};

async function callOpenAI(apiKey: string, payload: any) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(payload) },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'idee_score', strict: true, schema: SCHEMA } },
      temperature: 0.4,
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
    if (!userData.user) throw new Error('Not authenticated');

    const { idees, projet_ids } = await req.json();
    let ideesToScore = idees;
    if (!ideesToScore && projet_ids?.length) {
      const { data } = await supabase.from('projets').select('id, nom, objectif').in('id', projet_ids);
      ideesToScore = (data || []).map((p: any) => ({ id: p.id, nom: p.nom, objectif: p.objectif }));
    }
    if (!ideesToScore?.length) {
      return new Response(JSON.stringify({ scores: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: etoile } = await supabase.from('etoile_polaire').select('*').eq('user_id', userData.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

    let content: any;
    try {
      content = await callOpenAI(OPENAI_API_KEY, { etoile_polaire: etoile, idees: ideesToScore });
    } catch (_e) {
      content = await callOpenAI(OPENAI_API_KEY, { etoile_polaire: etoile, idees: ideesToScore });
    }

    for (const s of (content.scores || [])) {
      await supabase.from('projets').update({
        score_roi_effort: s.score_roi_effort,
        justification_pareto: s.justification_pareto,
      }).eq('id', s.id);
    }

    return new Response(JSON.stringify(content), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Scoring impossible" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

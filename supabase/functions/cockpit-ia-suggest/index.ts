import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Tu es le consultant stratégique d'Azur Keys Properties, conciergerie Airbnb haut de gamme à Saint-Raphaël (Côte d'Azur), 11 biens gérés, dirigeant solo (Noa) qui construit aussi son logiciel interne. Contexte saisonnier : juillet-août = haute saison (charge opérationnelle max, privilégier les projets à ROI immédiat et gain de temps), septembre-octobre = intersaison (moment idéal pour signer de nouveaux propriétaires), hiver = creux (projets de fond). Règle : max 3 projets en cours simultanément. À chaque projet validé : recommande les 2-3 prochains projets au meilleur ratio impact/effort compte tenu de la date, en 1 phrase de justification chacun. Ne pose des questions (max 2, courtes) QUE si le résultat du projet validé peut changer les priorités. Ne suggère JAMAIS un projet déjà fait ou abandonné. Réponds uniquement en JSON conforme au schéma.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: { type: "array", items: { type: "string" }, maxItems: 2 },
    suggestions: {
      type: "array", maxItems: 3,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          projet_id: { type: "string" },
          justification: { type: "string" },
        },
        required: ["projet_id", "justification"],
      },
    },
    repriorisations: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          projet_id: { type: "string" },
          nouvelle_priorite: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
          raison: { type: "string" },
        },
        required: ["projet_id", "nouvelle_priorite", "raison"],
      },
    },
  },
  required: ["questions", "suggestions", "repriorisations"],
};

async function callOpenAI(apiKey: string, userPayload: any) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'cockpit_reco', strict: true, schema: SCHEMA },
      },
      temperature: 0.7,
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
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { projet_valide_id, resultat, reponses_questions } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const [{ data: poles }, { data: projets }] = await Promise.all([
      supabase.from('poles').select('*').order('numero'),
      supabase.from('projets').select('id, pole_id, nom, priorite, statut, impact, difficulte, resultat'),
    ]);

    const poleById = new Map((poles || []).map((p: any) => [p.id, `${p.numero}. ${p.nom}`]));
    const projet_valide = (projets || []).find((p: any) => p.id === projet_valide_id);
    const roadmap = (projets || []).map((p: any) => ({
      id: p.id, pole: poleById.get(p.pole_id) || '',
      nom: p.nom, priorite: p.priorite, statut: p.statut,
      impact: p.impact, difficulte: p.difficulte,
    }));

    const userPayload = {
      date_du_jour: new Date().toISOString().slice(0, 10),
      projet_valide: projet_valide ? {
        id: projet_valide.id,
        nom: projet_valide.nom,
        pole: poleById.get(projet_valide.pole_id),
        resultat: resultat ?? projet_valide.resultat,
      } : null,
      reponses_questions: reponses_questions || null,
      roadmap,
    };

    let content: any;
    try {
      content = await callOpenAI(OPENAI_API_KEY, userPayload);
    } catch (e) {
      // retry once
      try {
        content = await callOpenAI(OPENAI_API_KEY, userPayload);
      } catch (e2: any) {
        return new Response(JSON.stringify({
          error: "L'IA n'a pas pu analyser, réessayez",
          details: e2.message,
        }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Validate projet_ids
    const validIds = new Set(roadmap.map((r) => r.id));
    content.suggestions = (content.suggestions || []).filter((s: any) => validIds.has(s.projet_id));
    content.repriorisations = (content.repriorisations || []).filter((r: any) => validIds.has(r.projet_id));

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "L'IA n'a pas pu analyser, réessayez", details: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

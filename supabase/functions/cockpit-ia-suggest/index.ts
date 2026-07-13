import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { projet_valide, resultat, reponses_questions } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: poles } = await supabase.from('poles').select('*').order('numero');
    const { data: projets } = await supabase.from('projets').select('*');

    const roadmap = (poles || []).map((p: any) => ({
      pole: `${p.numero}. ${p.nom}`,
      objectif: p.objectif,
      projets: (projets || []).filter((pr: any) => pr.pole_id === p.id).map((pr: any) => ({
        nom: pr.nom, priorite: pr.priorite, statut: pr.statut,
        difficulte: pr.difficulte, impact: pr.impact, resultat: pr.resultat,
      })),
    }));

    const systemPrompt = `Tu es le consultant stratégique d'Azur Keys Properties, conciergerie Airbnb haut de gamme à Saint-Raphaël, 11 biens, dirigeant solo. Après chaque projet validé, analyse la roadmap complète et recommande les 2-3 prochains projets au meilleur ROI (1 phrase de justification chacun). Pose d'abord 1-2 questions courtes si le résultat du projet change les priorités. Tiens compte de la saisonnalité Côte d'Azur : juillet-août = haute saison ops, sept-oct = période de signature des propriétaires. Sois direct et concis.

Réponds STRICTEMENT en JSON avec ce format :
{
  "questions": ["question 1", "question 2"],
  "suggestions": [{"projet": "nom", "justification": "phrase"}],
  "repriorisations": [{"projet": "nom", "nouvelle_priorite": "P1|P2|P3|P4", "raison": "phrase"}]
}
Si tu poses des questions, laisse suggestions et repriorisations vides. Sinon, laisse questions vide.`;

    const userPayload = {
      date: new Date().toISOString().slice(0, 10),
      roadmap,
      projet_valide,
      resultat,
      reponses_questions: reponses_questions || null,
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      return new Response(JSON.stringify({ error: 'OpenAI error', details: txt }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiRes.json();
    const content = JSON.parse(openaiData.choices[0].message.content);

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

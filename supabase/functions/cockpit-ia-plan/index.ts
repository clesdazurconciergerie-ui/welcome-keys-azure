import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Tu es le consultant stratégique d'Azur Keys Properties, conciergerie Airbnb haut de gamme à Saint-Raphaël (Côte d'Azur), dirigée en solo par Noa. Contexte saisonnier : juillet-août = haute saison (ROI immédiat, gain de temps), septembre-octobre = intersaison (idéal pour signer de nouveaux propriétaires), hiver = projets de fond. Règles STRICTES : max 3 projets actifs simultanément ; chaque projet a 4-6 actions concrètes et exécutables (pas de vague "réfléchir à…") ; réponds UNIQUEMENT en JSON conforme au schéma.`;

const POLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    projets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          pole_numero: { type: "integer", minimum: 1, maximum: 12 },
          nom: { type: "string" },
          objectif: { type: "string" },
          priorite: { type: "string", enum: ["P1","P2","P3","P4"] },
          impact: { type: "integer", minimum: 1, maximum: 5 },
          difficulte: { type: "integer", minimum: 1, maximum: 5 },
          actions: { type: "array", minItems: 4, maxItems: 6, items: { type: "string" } },
        },
        required: ["pole_numero","nom","objectif","priorite","impact","difficulte","actions"],
      },
    },
  },
  required: ["projets"],
};

async function callOpenAI(apiKey: string, userPayload: any, maxProjets: number) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + ` Génère EXACTEMENT ${maxProjets} projet(s), pas plus.` },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'cockpit_plan', strict: true, schema: POLE_SCHEMA },
      },
      temperature: 0.6,
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error('Not authenticated');

    const body = await req.json();
    const mode: "initial" | "next" = body.mode || "next";

    // Load context + poles + roadmap
    const [{ data: ctx }, { data: poles }, { data: projets }] = await Promise.all([
      supabase.from('contexte_business').select('reponses').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('poles').select('id, numero, nom, objectif').order('numero'),
      supabase.from('projets').select('id, pole_id, nom, statut, resultat, date_validation, priorite').order('created_at'),
    ]);

    const poleByNum = new Map((poles || []).map((p: any) => [p.numero, p]));
    const activeCount = (projets || []).filter((p: any) => p.statut === 'en_cours' || p.statut === 'a_faire').length;
    const maxProjets = mode === 'initial' ? 3 : Math.max(1, Math.min(2, 3 - activeCount));

    if (mode === 'next' && maxProjets <= 0) {
      return new Response(JSON.stringify({ projets: [], skipped: true, reason: "3 projets déjà actifs" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userPayload = {
      date_du_jour: new Date().toISOString().slice(0, 10),
      mode,
      contexte_business: ctx?.reponses || {},
      poles_disponibles: (poles || []).map((p: any) => ({ numero: p.numero, nom: p.nom, objectif: p.objectif })),
      historique_projets: (projets || []).map((p: any) => ({
        nom: p.nom, statut: p.statut, resultat: p.resultat, date_validation: p.date_validation,
      })),
      dernier_projet_valide: body.projet_valide || null,
      max_projets: maxProjets,
    };

    let content: any;
    try {
      content = await callOpenAI(OPENAI_API_KEY, userPayload, maxProjets);
    } catch (_e) {
      content = await callOpenAI(OPENAI_API_KEY, userPayload, maxProjets);
    }

    const inserted: any[] = [];
    for (const pr of (content.projets || []).slice(0, maxProjets)) {
      const pole = poleByNum.get(pr.pole_numero);
      if (!pole) continue;
      const { data: newProjet, error: e1 } = await supabase.from('projets').insert({
        pole_id: (pole as any).id,
        nom: pr.nom,
        objectif: pr.objectif,
        priorite: pr.priorite,
        impact: pr.impact,
        difficulte: pr.difficulte,
        statut: 'a_faire',
        recommande: true,
      }).select('id').single();
      if (e1 || !newProjet) continue;
      const rows = (pr.actions || []).map((texte: string, i: number) => ({
        projet_id: newProjet.id, ordre: i, texte,
      }));
      if (rows.length) await supabase.from('actions').insert(rows);
      inserted.push({ id: newProjet.id, nom: pr.nom });
    }

    return new Response(JSON.stringify({ projets: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "L'IA n'a pas pu générer le plan" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

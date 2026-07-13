import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SYSTEM_PROMPT = `Tu es le consultant stratégique d'Azur Keys Properties, conciergerie Airbnb haut de gamme à Saint-Raphaël (Côte d'Azur), dirigée en solo par Noa. Contexte saisonnier : juillet-août = haute saison (ROI immédiat, gain de temps), septembre-octobre = intersaison (idéal pour signer de nouveaux propriétaires), hiver = projets de fond.

Règles STRICTES :
- Max 3 projets actifs simultanément
- Chaque projet a 4-6 actions concrètes et exécutables (pas de vague "réfléchir à…")
- Applique strictement la loi de Pareto : ne propose QUE des projets dans le top 20% du ratio impact/effort
- Chaque suggestion doit annoncer son impact estimé sur l'Étoile Polaire de Noa (fournie dans le contexte)
- Si tu ne peux pas justifier l'impact, ne propose pas le projet
- Utilise les débriefs passés (résultats réels, temps réels, "à refaire") pour calibrer tes estimations
- Réponds UNIQUEMENT en JSON conforme au schéma`;

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
          score_roi_effort: { type: "integer", minimum: 1, maximum: 10 },
          justification_pareto: { type: "string" },
          impact_etoile_polaire: { type: "string" },
          actions: { type: "array", minItems: 4, maxItems: 6, items: { type: "string" } },
        },
        required: ["pole_numero","nom","objectif","priorite","impact","difficulte","score_roi_effort","justification_pareto","impact_etoile_polaire","actions"],
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
    const mode: "initial" | "next" | "decoupe" = body.mode || "next";

    const [{ data: ctx }, { data: poles }, { data: projets }, { data: etoile }] = await Promise.all([
      supabase.from('contexte_business').select('reponses').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('poles').select('id, numero, nom, objectif').order('numero'),
      supabase.from('projets').select('id, pole_id, nom, statut, resultat, temps_reel, a_refaire, date_validation, priorite, is_backlog').order('created_at'),
      supabase.from('etoile_polaire').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const poleByNum = new Map((poles || []).map((p: any) => [p.numero, p]));
    const activeCount = (projets || []).filter((p: any) => (p.statut === 'en_cours' || p.statut === 'a_faire') && !p.is_backlog).length;

    // Découpe : re-génère des actions plus petites pour un projet existant
    if (mode === 'decoupe' && body.projet_id) {
      const { data: projet } = await supabase.from('projets').select('*').eq('id', body.projet_id).single();
      if (!projet) throw new Error('Projet introuvable');
      const pole = (poles || []).find((p: any) => p.id === projet.pole_id);
      const payload = {
        mode: 'decoupe',
        etoile_polaire: etoile || null,
        projet: { nom: projet.nom, objectif: projet.objectif },
        pole: pole ? { numero: pole.numero, nom: pole.nom } : null,
        instruction: "Ce projet stagne. Redécoupe en actions plus petites (max 30 min chacune), très concrètes.",
      };
      const content = await callOpenAI(OPENAI_API_KEY, payload, 1);
      const pr = (content.projets || [])[0];
      if (pr) {
        await supabase.from('actions').delete().eq('projet_id', projet.id).eq('fait', false);
        const rows = (pr.actions || []).map((texte: string, i: number) => ({
          projet_id: projet.id, ordre: 100 + i, texte,
        }));
        if (rows.length) await supabase.from('actions').insert(rows);
        await supabase.from('projets').update({ last_activity_at: new Date().toISOString() }).eq('id', projet.id);
      }
      return new Response(JSON.stringify({ ok: true, actions: pr?.actions || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const maxProjets = mode === 'initial' ? 3 : Math.max(1, Math.min(2, 3 - activeCount));

    if (mode === 'next' && maxProjets <= 0) {
      return new Response(JSON.stringify({ projets: [], skipped: true, reason: "3 projets déjà actifs" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 10 derniers débriefs
    const debriefs = (projets || [])
      .filter((p: any) => p.statut === 'fait' && p.resultat)
      .sort((a: any, b: any) => (b.date_validation || '').localeCompare(a.date_validation || ''))
      .slice(0, 10)
      .map((p: any) => ({ nom: p.nom, resultat: p.resultat, temps_reel: p.temps_reel, a_refaire: p.a_refaire }));

    const userPayload = {
      date_du_jour: new Date().toISOString().slice(0, 10),
      mode,
      contexte_business: ctx?.reponses || {},
      etoile_polaire: etoile ? {
        metrique: etoile.nom_metrique, cible: etoile.valeur_cible,
        actuelle: etoile.valeur_actuelle, echeance: etoile.echeance,
      } : null,
      derniers_debriefs: debriefs,
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
        score_roi_effort: pr.score_roi_effort,
        justification_pareto: pr.justification_pareto,
        impact_etoile_polaire: pr.impact_etoile_polaire,
        statut: 'a_faire',
        recommande: true,
      }).select('id').single();
      if (e1 || !newProjet) continue;
      const rows = (pr.actions || []).map((texte: string, i: number) => ({
        projet_id: newProjet.id, ordre: i, texte,
      }));
      if (rows.length) await supabase.from('actions').insert(rows);
      inserted.push({
        id: newProjet.id, nom: pr.nom,
        score_roi_effort: pr.score_roi_effort,
        justification_pareto: pr.justification_pareto,
        impact_etoile_polaire: pr.impact_etoile_polaire,
      });
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

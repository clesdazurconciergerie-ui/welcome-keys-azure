import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fonction de nettoyage des textes générés
function cleanGeneratedText(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/[*#_\-•>]+/g, ' ')           // supprime tous symboles markdown ou listes
    .replace(/\s{2,}/g, ' ')               // retire espaces multiples
    .replace(/\.(\s+)/g, '.\n')            // retour à la ligne après chaque point
    .replace(/\n{2,}/g, '\n')              // limite à une ligne vide max
    .replace(/(^\s+|\s+$)/gm, '')          // trim chaque ligne
    .replace(/([a-z0-9])([A-Z])/g, '$1. $2') // ajoute point entre phrases collées
    .trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyName, propertyAddress, contentType } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (contentType) {
      case 'welcome_message':
        systemPrompt = 'Tu es un assistant qui rédige des messages de bienvenue chaleureux pour des locations de vacances de luxe. Le ton doit être professionnel, accueillant et personnalisé.';
        userPrompt = `Rédige un message de bienvenue pour le bien "${propertyName}" situé à ${propertyAddress}. 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide et professionnel, SANS caractères Markdown ni listes à puces
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- AUCUN symbole spécial (*, -, #, _, etc.)
- Ton clair, accueillant et concis
- 3-4 phrases maximum

Format attendu :
Bienvenue dans notre logement.
Nous sommes ravis de vous accueillir.
Profitez de votre séjour.

Rédige maintenant le message de bienvenue.`;
        break;
      
      case 'checkin_procedure':
        systemPrompt = 'Tu es un assistant qui rédige des procédures de check-in claires pour des locations de vacances.';
        userPrompt = `Rédige une procédure de check-in détaillée pour le bien "${propertyName}" situé à ${propertyAddress}. 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide SANS Markdown ni listes à puces
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- AUCUN symbole (*, -, #, _)
- Ton précis et accueillant

Inclus : récupération des clés, parking temporaire, accès au logement.`;
        break;
      
      case 'checkout_procedure':
        systemPrompt = 'Tu es un assistant qui rédige des procédures de check-out claires pour des locations de vacances.';
        userPrompt = `Rédige une procédure de check-out pour le bien "${propertyName}". 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide SANS Markdown ni listes
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- AUCUN symbole spécial (*, -, #, _)
- Ton amical mais clair

Inclus : heure limite, restitution des clés, état des lieux, poubelles, électricité/chauffage.`;
        break;
      
      case 'parking_info':
        systemPrompt = 'Tu es un assistant qui rédige des informations de stationnement pour des locations de vacances.';
        userPrompt = `Rédige les informations de stationnement pour le bien "${propertyName}" situé à ${propertyAddress}. 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide SANS Markdown
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- AUCUN symbole (*, -, #, _)
- Ton clair et pratique

Mentionne : parking privé ou public, gratuit/payant, places à proximité, restrictions.`;
        break;
      
      case 'house_rules':
        systemPrompt = 'Tu es un assistant qui rédige des règlements intérieurs pour des locations de vacances. Le ton doit être clair, professionnel mais amical.';
        userPrompt = `Rédige un règlement intérieur pour le bien "${propertyName}". 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide en phrases complètes, PAS de listes à puces
- AUCUN symbole Markdown (*, -, #, _, etc.)
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- Phrases courtes et polies
- Ton accueillant et pas trop strict

Inclus ces points (en phrases complètes) :
Non fumeur
Respect du voisinage (pas de bruit après 22h)
Pas de fêtes ou événements
Tri des déchets
Respect des équipements
Nombre maximum d'occupants`;
        break;
      
      case 'waste_location':
        systemPrompt = 'Tu es un assistant qui rédige des instructions pour la gestion des déchets dans des locations de vacances.';
        userPrompt = `Rédige les informations sur l'emplacement des poubelles pour le bien "${propertyName}". 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide SANS Markdown
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- AUCUN symbole (*, -, #, _)
- Ton pratique

Indique : emplacement des containers, jours de collecte, accès.`;
        break;
      
      case 'sorting_instructions':
        systemPrompt = 'Tu es un assistant qui rédige des instructions de tri sélectif claires et pédagogiques.';
        userPrompt = `Rédige les instructions de tri sélectif pour le bien "${propertyName}". 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide SANS listes à puces ni Markdown
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- AUCUN symbole (*, -, #, _)
- Ton clair et pratique

Explique : verre, recyclage, ordures ménagères, compost si applicable.`;
        break;
      
      case 'cleaning_rules':
        systemPrompt = 'Tu es un assistant qui rédige des règles de nettoyage pour des locations de vacances.';
        userPrompt = `Rédige les règles de nettoyage avant le départ pour le bien "${propertyName}". 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide SANS Markdown
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- AUCUN symbole (*, -, #, _)
- Ton courtois mais précis

Inclus : vaisselle, poubelles, état général attendu.`;
        break;
      
      case 'safety_instructions':
        systemPrompt = 'Tu es un assistant qui rédige des consignes de sécurité pour des locations de vacances.';
        userPrompt = `Rédige les consignes de sécurité essentielles pour le bien "${propertyName}". 

RÈGLES D'ÉCRITURE STRICTES :
- Texte fluide en phrases complètes, PAS de listes
- AUCUN symbole Markdown (*, -, #, _)
- Chaque phrase doit se terminer par un point suivi d'un retour à la ligne
- Ton rassurant mais complet

Inclus : détecteurs de fumée, extincteur, coupures d'urgence (eau, électricité, gaz), évacuation, numéros d'urgence.`;
        break;
      
      default:
        throw new Error('Invalid content type');
    }

    console.log('Calling OpenAI API for:', contentType);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let generatedText = data.choices[0].message.content;

    // Nettoyer le texte généré
    generatedText = cleanGeneratedText(generatedText);

    // Vérifier s'il reste des symboles Markdown
    if (/[*#_\-•>]/.test(generatedText)) {
      console.warn('Warning: Markdown symbols still present after cleaning');
      generatedText = cleanGeneratedText(generatedText); // Réappliquer
    }

    console.log('Generated and cleaned text successfully');

    return new Response(
      JSON.stringify({ generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-description function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

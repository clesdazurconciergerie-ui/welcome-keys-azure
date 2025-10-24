import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        userPrompt = `Rédige un message de bienvenue pour le bien "${propertyName}" situé à ${propertyAddress}. Le message doit être court (3-4 phrases), chaleureux et mentionner que nous sommes ravis d'accueillir nos hôtes.`;
        break;
      
      case 'house_rules':
        systemPrompt = 'Tu es un assistant qui rédige des règlements intérieurs pour des locations de vacances. Le ton doit être clair, professionnel mais amical.';
        userPrompt = `Rédige un règlement intérieur standard pour le bien "${propertyName}". Inclus les points suivants sous forme de liste :
- Non fumeur
- Respect du voisinage (pas de bruit après 22h)
- Pas de fêtes ou événements
- Tri des déchets
- Respect des équipements
- Nombre maximum d'occupants
Le tout en restant accueillant et pas trop strict.`;
        break;
      
      case 'emergency_contacts':
        systemPrompt = 'Tu es un assistant qui liste les contacts d\'urgence en France.';
        userPrompt = `Liste les numéros d'urgence français essentiels de manière claire et formatée :
Police, Pompiers, SAMU, Urgences européennes, Médecin de garde.`;
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
    const generatedText = data.choices[0].message.content;

    console.log('Generated text successfully');

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

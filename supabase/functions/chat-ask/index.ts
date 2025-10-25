import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pin: pinCode, message, locale = 'fr' } = await req.json();

    if (!pinCode || !message) {
      return new Response(
        JSON.stringify({ error: 'PIN et message requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY non configurée');
      return new Response(
        JSON.stringify({ error: 'Service momentanément indisponible' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const normalizedPin = pinCode.replace(/\s+/g, '').toUpperCase();

    // Récupérer le livret via le PIN
    const { data: pinData, error: pinError } = await supabase
      .from('pins')
      .select('booklet_id')
      .eq('pin_code', normalizedPin)
      .eq('status', 'active')
      .single();

    if (pinError || !pinData) {
      console.error('PIN non trouvé:', pinError);
      return new Response(
        JSON.stringify({ error: 'Code invalide ou expiré' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le booklet
    const { data: booklet, error: bookletError } = await supabase
      .from('booklets')
      .select('*')
      .eq('id', pinData.booklet_id)
      .eq('status', 'published')
      .single();

    if (bookletError || !booklet) {
      console.error('Livret non trouvé:', bookletError);
      return new Response(
        JSON.stringify({ error: 'Livret non publié' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les données Wi-Fi (SSID uniquement)
    const { data: wifiData } = await supabase
      .from('wifi_credentials')
      .select('ssid')
      .eq('booklet_id', booklet.id)
      .maybeSingle();

    // Récupérer les équipements
    const { data: equipment } = await supabase
      .from('equipment')
      .select('name, category, instructions, manual_url')
      .eq('booklet_id', booklet.id);

    // Récupérer la FAQ
    const { data: faq } = await supabase
      .from('faq')
      .select('question, answer, order_index')
      .eq('booklet_id', booklet.id)
      .order('order_index');

    // Classification d'intent
    const messageLower = message.toLowerCase();
    const isWifiPasswordRequest = messageLower.includes('wifi') && 
      (messageLower.includes('mot de passe') || messageLower.includes('password') || messageLower.includes('mdp'));
    
    const isSensitiveRequest = 
      messageLower.includes('adresse exacte') ||
      messageLower.includes('code') ||
      messageLower.includes('digicode') ||
      messageLower.includes('numéro de porte') ||
      messageLower.includes('email') ||
      messageLower.includes('téléphone') ||
      messageLower.includes('propriétaire') ||
      messageLower.includes('tel ') ||
      messageLower.includes('tél');

    const isSearchableQuery = 
      messageLower.includes('météo') ||
      messageLower.includes('évènement') ||
      messageLower.includes('événement') ||
      messageLower.includes('transport') ||
      messageLower.includes('bus') ||
      messageLower.includes('pharmacie de garde') ||
      messageLower.includes('sortie') ||
      messageLower.includes('activité');

    // Bloquer les demandes sensibles
    if (isSensitiveRequest) {
      return new Response(
        JSON.stringify({ 
          answer: "Je ne peux pas partager d'informations sensibles comme des codes d'accès, adresses précises ou contacts privés. Pour toute question urgente, contactez la conciergerie via les coordonnées fournies dans le livret." 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } 
        }
      );
    }

    // Construire le contexte pour le chatbot
    const nearby = Array.isArray(booklet.nearby) ? booklet.nearby : 
                   (typeof booklet.nearby === 'string' ? JSON.parse(booklet.nearby) : []);

    const context = `
Tu es l'assistant virtuel du livret d'accueil "${booklet.property_name}". 

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec les informations ci-dessous
- Ne partage JAMAIS : codes d'accès, mots de passe (sauf Wi-Fi via bouton dédié), emails/téléphones privés, adresses exactes, numéros de porte
- Si l'info n'est pas dans le contexte : "Je n'ai pas cette information dans le livret. Contactez la conciergerie."
- Pour le mot de passe Wi-Fi : "Cliquez sur le bouton 'Afficher le mot de passe Wi-Fi' dans la section Wi-Fi du livret."

IDENTITÉ:
- Nom: ${booklet.property_name}
- Slogan: ${booklet.tagline || 'Non renseigné'}
- Message de bienvenue: ${booklet.welcome_message || 'Non renseigné'}

INFORMATIONS PRATIQUES:
- Adresse: ${booklet.property_address}
- Lien Google Maps: ${booklet.google_maps_link || 'Non renseigné'}
- Heure d'arrivée: ${booklet.check_in_time || 'Non renseignée'}
- Heure de départ: ${booklet.check_out_time || 'Non renseignée'}
- Procédure d'arrivée: ${booklet.checkin_procedure || 'Non renseignée'}
- Procédure de départ: ${booklet.checkout_procedure || 'Non renseignée'}
- Code d'accès: ${booklet.access_code || 'Non renseigné'}
- Stationnement: ${booklet.parking_info || 'Non renseigné'}
- Règlement intérieur: ${booklet.house_rules || 'Non renseigné'}
- Conseils de sécurité: ${booklet.safety_tips || 'Non renseigné'}

WI-FI:
- Réseau Wi-Fi: ${wifiData?.ssid || 'Non configuré'}
- Pour obtenir le mot de passe Wi-Fi, dis à l'utilisateur : "Cliquez sur le bouton 'Afficher le mot de passe Wi-Fi' dans la section Wi-Fi du livret."

MÉNAGE & TRI:
- Emplacement poubelles: ${booklet.waste_location || 'Non renseigné'}
- Instructions de tri: ${booklet.sorting_instructions || 'Non renseignées'}
- Règles de nettoyage: ${booklet.cleaning_rules || 'Non renseignées'}
- Conseils d'entretien: ${booklet.cleaning_tips || 'Non renseignés'}

ÉQUIPEMENTS:
${equipment?.map((e: any) => `- ${e.name} (${e.category}): ${e.instructions || 'Pas d\'instructions'}`).join('\n') || 'Aucun équipement listé'}

À PROXIMITÉ:
${nearby.filter((p: any) => p.name && p.category).map((p: any) => 
  `- ${p.name} (${p.category})${p.distance ? ' - ' + p.distance : ''}${p.mapsUrl ? ' - Lien: ' + p.mapsUrl : ''}`
).join('\n') || 'Aucun lieu enregistré'}

FAQ (réponds directement aux questions similaires):
${faq?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
  .map((f: any) => `Q: ${f.question}\nR: ${f.answer}`).join('\n\n') || 'Aucune FAQ'}

LÉGAL:
- Licence: ${booklet.airbnb_license || 'Non renseignée'}
- Consignes de sécurité: ${booklet.safety_instructions || 'Non renseignées'}
- RGPD: ${booklet.gdpr_notice || 'Non renseigné'}
- Clause de non-responsabilité: ${booklet.disclaimer || 'Non renseignée'}

Réponds de manière concise, polie et factuelle en ${locale === 'en' ? 'anglais' : 'français'}. Propose des liens Maps si pertinent.
    `.trim();

    let finalAnswer = '';

    // Appeler Lovable AI avec le contexte du livret
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erreur Lovable AI:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Service momentanément indisponible. Réessayez plus tard.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    finalAnswer = aiData.choices?.[0]?.message?.content || '';

    // Si la réponse indique que l'info n'est pas dans le livret ET que c'est une question "searchable"
    const noInfoInBooklet = finalAnswer.toLowerCase().includes("n'ai pas cette information") || 
                           finalAnswer.toLowerCase().includes("contactez la conciergerie");
    
    if (noInfoInBooklet && isSearchableQuery) {
      // Réponse générale pour les questions searchables non trouvées dans le livret
      const cityName = booklet.property_address?.split(',').pop()?.trim() || 'la région';
      finalAnswer = `Je n'ai pas cette information spécifique dans le livret. Pour des informations générales sur ${cityName} (météo, transports, événements), vous pouvez consulter les sites officiels locaux ou l'office du tourisme. Pour toute question urgente, contactez la conciergerie via les coordonnées fournies dans le livret.`;
    }

    return new Response(
      JSON.stringify({ answer: finalAnswer || 'Désolé, je n\'ai pas pu générer une réponse.' }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        } 
      }
    );

  } catch (error) {
    console.error('Erreur chat-ask:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

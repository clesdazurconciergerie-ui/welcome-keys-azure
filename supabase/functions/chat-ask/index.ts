import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalisation du texte
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprimer accents
    .replace(/[^\w\s]/g, " ") // ponctuation → espace
    .replace(/\s+/g, " ")
    .trim();
}

// Nettoyage et formatage de la réponse du chatbot
function formatChatbotResponse(text: string): string {
  if (!text) return '';
  return text
    .replace(/[*#_\-•>]+/g, ' ')        // retire les symboles Markdown
    .replace(/\s{2,}/g, ' ')            // nettoie les espaces multiples
    .replace(/\.(\s+|$)/g, '.\n')       // retour à la ligne après chaque point
    .replace(/\n{2,}/g, '\n')           // limite les lignes vides
    .trim();
}

// Détection d'intent avec synonymes
const INTENT_PATTERNS = {
  WIFI_PASSWORD: /(?:mdp|mot de passe|password|code)\s+(?:wifi|wi-fi)/,
  WIFI_SSID: /(?:nom|ssid|reseau|network)\s+(?:wifi|wi-fi)/,
  CHECKIN: /(?:arrivee|check.?in|entree|cle|coffre|acces|arriver)/,
  CHECKOUT: /(?:depart|check.?out|sortie|partir|quitter)/,
  PARKING: /(?:parking|stationner|garer|voiture|place)/,
  TRI: /(?:tri|trier|recycl|dechet|poubelle|benne|verre|carton)/,
  EQUIPEMENTS: /(?:machine|appareil|equipement|cafetiere|lave|frigo|four|tv|chauffage)/,
  A_PROXIMITE: /(?:proche|proximite|restaurant|bar|plage|commerce|pharmacie|boulangerie|supermarche)/,
  URGENCES: /(?:urgence|hopital|medecin|pompier|police|pharmacie de garde)/,
  TRANSPORTS: /(?:bus|tram|metro|train|transport|navette)/,
  MAISON: /(?:regle|reglement|interdit|autorise|fumer|bruit|animaux)/,
};

function detectIntent(message: string): string {
  const normalized = normalize(message);
  
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(normalized)) {
      return intent;
    }
  }
  
  return 'AUTRE';
}

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

    // Détecter l'intent de la question
    const intent = detectIntent(message);
    console.log('Intent détecté:', intent, 'pour:', message);

    // Bloquer les demandes sensibles explicites
    const normalized = normalize(message);
    const isSensitiveRequest = 
      /(?:adresse exacte|code porte|digicode|numero de porte|email|telephone|tel|proprietaire|owner)/.test(normalized);

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

    // Construire les facts selon l'intent
    let facts: any = {};
    let needsWifiPassword = false;

    switch (intent) {
      case 'WIFI_PASSWORD':
        facts.wifi_ssid = wifiData?.ssid || 'Non configuré';
        needsWifiPassword = true;
        break;
      
      case 'WIFI_SSID':
        facts.wifi_ssid = wifiData?.ssid || 'Non configuré';
        break;
      
      case 'CHECKIN':
        facts.check_in_time = booklet.check_in_time;
        facts.checkin_procedure = booklet.checkin_procedure;
        facts.access_code = booklet.access_code ? '(code fourni)' : null;
        facts.google_maps_link = booklet.google_maps_link;
        break;
      
      case 'CHECKOUT':
        facts.check_out_time = booklet.check_out_time;
        facts.checkout_procedure = booklet.checkout_procedure;
        facts.cleaning_rules = booklet.cleaning_rules;
        break;
      
      case 'PARKING':
        facts.parking_info = booklet.parking_info;
        facts.property_address = booklet.property_address;
        break;
      
      case 'TRI':
        facts.waste_location = booklet.waste_location;
        facts.sorting_instructions = booklet.sorting_instructions;
        facts.cleaning_tips = booklet.cleaning_tips;
        break;
      
      case 'EQUIPEMENTS':
        facts.equipment = equipment?.map((e: any) => ({
          name: e.name,
          category: e.category,
          instructions: e.instructions
        })) || [];
        break;
      
      case 'A_PROXIMITE':
        const nearby = Array.isArray(booklet.nearby) ? booklet.nearby : 
                      (typeof booklet.nearby === 'string' ? JSON.parse(booklet.nearby) : []);
        facts.nearby = nearby
          .filter((p: any) => p.name && p.category)
          .slice(0, 5)
          .map((p: any) => ({
            name: p.name,
            category: p.category,
            distance: p.distance,
            mapsUrl: p.mapsUrl
          }));
        break;
      
      case 'URGENCES':
        facts.emergency_contacts = booklet.emergency_contacts;
        facts.safety_tips = booklet.safety_tips;
        break;
      
      case 'TRANSPORTS':
        const nearbyAll = Array.isArray(booklet.nearby) ? booklet.nearby : 
                         (typeof booklet.nearby === 'string' ? JSON.parse(booklet.nearby) : []);
        facts.transports = nearbyAll
          .filter((p: any) => p.category === 'Transport')
          .map((p: any) => ({ name: p.name, distance: p.distance, mapsUrl: p.mapsUrl }));
        break;
      
      case 'MAISON':
        facts.house_rules = booklet.house_rules;
        facts.safety_tips = booklet.safety_tips;
        break;
      
      default:
        // Pour AUTRE, chercher dans la FAQ
        if (faq && faq.length > 0) {
          facts.faq = faq.map((f: any) => ({
            question: f.question,
            answer: f.answer
          }));
        }
    }

    // Récupérer le mot de passe Wi-Fi si nécessaire via l'endpoint sécurisé
    if (needsWifiPassword && wifiData?.ssid) {
      try {
        const wifiResponse = await fetch(
          `${supabaseUrl}/functions/v1/get-wifi-by-pin?pin=${normalizedPin}`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
          }
        );
        
        if (wifiResponse.ok) {
          const wifiResult = await wifiResponse.json();
          facts.wifi_password = wifiResult.password;
        }
      } catch (error) {
        console.error('Erreur récupération Wi-Fi:', error);
      }
    }

    // Construire le prompt de composition avec les facts
    const systemPrompt = `Tu es l'assistant du livret d'accueil "${booklet.property_name}".

RÈGLES STRICTES DE FORMAT :
- Formate ta réponse de manière claire et professionnelle
- Ne mets AUCUN caractère Markdown (*, #, -, _, >)
- Fais un retour à la ligne après chaque phrase complète (après chaque point)
- Le ton doit être naturel, accueillant et fluide
- N'utilise ni emojis ni symboles spéciaux
- Compose une réponse claire, concise et actionnable à partir des FACTS fournis
- Ne partage JAMAIS : codes précis (sauf si fourni dans facts.access_code avec mention "code fourni"), emails/téléphones privés, adresses exactes complètes
- Si une info manque dans les FACTS : propose une alternative utile ou indique poliment que l'info n'est pas disponible
- Fournis des liens Maps quand disponibles
- Format : français si locale=fr, anglais si locale=en

EXEMPLE DE FORMAT ATTENDU :
Le check-in se fait à partir de 16h.
Les clés sont dans le coffre à côté de la porte d'entrée.
Merci de prévenir la conciergerie en cas d'arrivée tardive.

INTENT DÉTECTÉ : ${intent}

FACTS DISPONIBLES :
${JSON.stringify(facts, null, 2)}

Question de l'utilisateur : "${message}"

Compose une réponse utile en utilisant les FACTS. Si les FACTS sont vides ou insuffisants, dis-le poliment et propose de contacter la conciergerie.`;

    // Appeler Lovable AI pour composer la réponse
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 400,
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
    const rawAnswer = aiData.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
    const answer = formatChatbotResponse(rawAnswer);

    return new Response(
      JSON.stringify({ answer }),
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

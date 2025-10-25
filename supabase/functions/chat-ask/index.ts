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
  METEO: /(?:meteo|temps|climat|temperature|pluie|soleil|vent|chaud|froid|demain|aujourd.?hui)/,
  RESTAURANT: /(?:restaurant|manger|diner|dejeuner|italien|pizza|cuisine|resto|gastronomie)/,
  ACTIVITES: /(?:activite|faire|visiter|voir|balade|plage|musee|enfants|famille|sport|loisir)/,
  WIFI_PASSWORD: /(?:mdp|mot de passe|password|code)\s+(?:wifi|wi-fi)/,
  WIFI_SSID: /(?:nom|ssid|reseau|network)\s+(?:wifi|wi-fi)/,
  CHECKIN: /(?:arrivee|check.?in|entree|cle|coffre|acces|arriver)/,
  CHECKOUT: /(?:depart|check.?out|sortie|partir|quitter)/,
  PARKING: /(?:parking|stationner|garer|voiture|place)/,
  TRI: /(?:tri|trier|recycl|dechet|poubelle|benne|verre|carton)/,
  EQUIPEMENTS: /(?:machine|appareil|equipement|cafetiere|lave|frigo|four|tv|chauffage)/,
  INFOS_PRATIQUES: /(?:pharmacie|supermarche|epicerie|boulangerie|banque|poste|commerce)/,
  URGENCES: /(?:urgence|hopital|medecin|pompier|police|pharmacie de garde)/,
  TRANSPORTS: /(?:bus|tram|metro|train|transport|navette|taxi|vtc)/,
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

// Générer des liens 1-clic pour recherche Google/Maps
function generateSearchLinks(city: string, query: string): { maps: string; web: string } {
  const mapsQuery = encodeURIComponent(`${query} ${city}`);
  const webQuery = encodeURIComponent(`${query} ${city}`);
  return {
    maps: `https://www.google.com/maps/search/${mapsQuery}`,
    web: `https://www.google.com/search?q=${webQuery}`
  };
}

// Initialiser le contexte de localisation depuis le livret
function initLocationContext(booklet: any): any {
  return {
    city: booklet.city || 'la ville',
    country: booklet.country || '',
    lat: booklet.geo?.lat || null,
    lon: booklet.geo?.lon || null,
    timezone: booklet.timezone || 'Europe/Paris',
    language: booklet.language || 'fr'
  };
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

    // Récupérer les FAQ
    const { data: faq } = await supabase
      .from('faq')
      .select('question, answer, order_index')
      .eq('booklet_id', booklet.id)
      .order('order_index');

    // Récupérer les highlights
    const { data: highlights } = await supabase
      .from('highlights')
      .select('title, type, description, url, rating, price_range, tags, order_index')
      .eq('booklet_id', booklet.id)
      .order('order_index');

    // Récupérer les restaurants
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('name, cuisine, price_range, address, phone, url, rating, tags, is_owner_pick, order_index')
      .eq('booklet_id', booklet.id)
      .order('is_owner_pick', { ascending: false })
      .order('rating', { ascending: false })
      .order('order_index');

    // Récupérer les activités
    const { data: activities } = await supabase
      .from('activities')
      .select('name, category, duration, price, when_available, booking_url, age_restrictions, tags, is_owner_pick, order_index')
      .eq('booklet_id', booklet.id)
      .order('is_owner_pick', { ascending: false })
      .order('order_index');

    // Récupérer les essentials
    const { data: essentials } = await supabase
      .from('essentials')
      .select('name, type, address, distance, hours, phone, notes, order_index')
      .eq('booklet_id', booklet.id)
      .order('order_index');

    // Récupérer les transports
    const { data: transport } = await supabase
      .from('transport')
      .select('name, type, address, distance, price, instructions, url, order_index')
      .eq('booklet_id', booklet.id)
      .order('order_index');

    // Initialiser le contexte de localisation
    const locationContext = initLocationContext(booklet);

    // Construire les facts selon l'intent
    let facts: any = { location: locationContext };
    let needsWifiPassword = false;

    switch (intent) {
      case 'METEO':
        facts.meteo_info = "Je n'ai pas accès à la météo en direct.";
        facts.search_link = generateSearchLinks(locationContext.city, `météo ${locationContext.city} demain`);
        break;
      
      case 'RESTAURANT':
        const cuisineMatch = message.toLowerCase().match(/(?:italien|pizza|francais|chinois|japonais|indien|mexicain|vegetarien)/);
        const cuisine = cuisineMatch ? cuisineMatch[0] : '';
        
        let selectedRestaurants = restaurants || [];
        if (cuisine && selectedRestaurants.length > 0) {
          selectedRestaurants = selectedRestaurants.filter((r: any) => 
            r.cuisine?.toLowerCase().includes(cuisine) || 
            r.tags?.some((t: string) => t.toLowerCase().includes(cuisine))
          );
        }
        
        facts.restaurants = selectedRestaurants.slice(0, 3).map((r: any) => ({
          name: r.name,
          cuisine: r.cuisine,
          price_range: r.price_range,
          address: r.address,
          rating: r.rating,
          tags: r.tags,
          is_owner_pick: r.is_owner_pick,
          url: r.url
        }));
        
        if (!facts.restaurants || facts.restaurants.length === 0) {
          const searchQuery = cuisine ? `restaurant ${cuisine}` : 'restaurant';
          facts.search_link = generateSearchLinks(locationContext.city, searchQuery);
        }
        break;
      
      case 'ACTIVITES':
        facts.activities = (activities || []).slice(0, 5).map((a: any) => ({
          name: a.name,
          category: a.category,
          duration: a.duration,
          price: a.price,
          when_available: a.when_available,
          tags: a.tags,
          is_owner_pick: a.is_owner_pick,
          booking_url: a.booking_url
        }));
        
        if (highlights && highlights.length > 0) {
          facts.highlights = highlights.slice(0, 3).map((h: any) => ({
            title: h.title,
            type: h.type,
            description: h.description
          }));
        }
        
        if (!facts.activities || facts.activities.length === 0) {
          facts.search_link = generateSearchLinks(locationContext.city, `que faire à`);
        }
        break;
      
      case 'INFOS_PRATIQUES':
        facts.essentials = (essentials || []).map((e: any) => ({
          name: e.name,
          type: e.type,
          address: e.address,
          distance: e.distance,
          hours: e.hours,
          phone: e.phone
        }));
        
        if (!facts.essentials || facts.essentials.length === 0) {
          const typeMatch = message.toLowerCase().match(/(?:pharmacie|supermarche|boulangerie|banque)/);
          const searchQuery = typeMatch ? typeMatch[0] : 'commerces';
          facts.search_link = generateSearchLinks(locationContext.city, searchQuery);
        }
        break;
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
      
      
      case 'URGENCES':
        facts.emergency_contacts = booklet.emergency_contacts;
        facts.safety_tips = booklet.safety_tips;
        break;
      
      case 'TRANSPORTS':
        facts.transport = (transport || []).map((t: any) => ({
          name: t.name,
          type: t.type,
          address: t.address,
          distance: t.distance,
          price: t.price,
          instructions: t.instructions,
          url: t.url
        }));
        
        if (!facts.transport || facts.transport.length === 0) {
          facts.search_link = generateSearchLinks(locationContext.city, 'transports en commun');
        }
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
    const systemPrompt = `Tu es l'assistant du livret d'accueil "${booklet.property_name}" à ${locationContext.city}, ${locationContext.country}.

CONTEXTE DE LOCALISATION :
Tu connais automatiquement la ville : ${locationContext.city}. Ne demande JAMAIS à l'utilisateur de préciser la ville sauf si c'est ambigu dans sa question.

RÈGLES STRICTES DE FORMAT :
- Formate ta réponse de manière claire et professionnelle
- Ne mets AUCUN caractère Markdown (*, #, -, _, >)
- Fais un retour à la ligne après chaque phrase complète (après chaque point)
- Le ton doit être naturel, accueillant et fluide
- N'utilise ni emojis ni symboles spéciaux
- Donne 2-3 options maximum, avec les infos clés (prix, distance approximative, réservation)

PRIORITÉS DE RÉPONSE :
1. Priorise TOUJOURS les éléments du livret (surtout ceux marqués "is_owner_pick: true")
2. Si une info manque dans le livret (météo, horaires en temps réel), propose un lien 1-clic vers Google/Maps fourni dans facts.search_link
3. Pour les liens de recherche, présente-les ainsi : "Tu peux consulter les dernières informations ici : [LIEN]"
4. Ne partage JAMAIS : codes d'accès précis (sauf mention explicite), emails/téléphones privés, adresses complètes

EXEMPLE DE FORMAT ATTENDU :
Le check-in se fait à partir de 16h.
Les clés sont dans le coffre à côté de la porte d'entrée.
Merci de prévenir la conciergerie en cas d'arrivée tardive.

INTENT DÉTECTÉ : ${intent}

FACTS DISPONIBLES :
${JSON.stringify(facts, null, 2)}

Question de l'utilisateur : "${message}"

Compose une réponse utile en utilisant les FACTS. Priorise toujours les recommandations du livret (owner picks). Si les données manquent, utilise le lien search_link fourni pour aider l'utilisateur.`;

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

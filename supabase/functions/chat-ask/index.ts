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
  RESTAURANT: /(?:restaurant|manger|diner|dejeuner|italien|pizza|cuisine|resto|gastronomie|poisson|mediterraneen|rapide|emporter)/,
  ACTIVITES: /(?:activite|faire|visiter|voir|balade|plage|musee|enfants|famille|sport|loisir|nautique|culture|randonnee|pluie|indoor)/,
  WIFI_PASSWORD: /(?:mdp|mot de passe|password|code)\s+(?:wifi|wi-fi)/,
  WIFI_SSID: /(?:nom|ssid|reseau|network)\s+(?:wifi|wi-fi)/,
  CHECKIN: /(?:arrivee|check.?in|entree|cle|coffre|acces|arriver)/,
  CHECKOUT: /(?:depart|check.?out|sortie|partir|quitter)/,
  PARKING: /(?:parking|stationner|garer|voiture|place)/,
  TRI: /(?:tri|trier|recycl|dechet|poubelle|benne|verre|carton)/,
  EQUIPEMENTS: /(?:machine|appareil|equipement|cafetiere|lave|frigo|four|tv|chauffage)/,
  INFOS_PRATIQUES: /(?:pharmacie|supermarche|supérette|epicerie|boulangerie|banque|poste|commerce|courses)/,
  URGENCES: /(?:urgence|hopital|medecin|pompier|police|pharmacie de garde)/,
  TRANSPORTS: /(?:bus|tram|metro|train|transport|navette|taxi|vtc)/,
  MAISON: /(?:regle|reglement|interdit|autorise|fumer|bruit|animaux)/,
};

// Catalogues par défaut (fallback garantissant des noms concrets)
const SECTOR_DEFAULTS: Record<string, any> = {
  "Saint-Raphaël": {
    restaurants: [
      { name: "La Voile d'Or", cuisine: ["méditerranéen", "poisson"], price_range: "€€€", is_owner_pick: true, address: "Port Santa Lucia" },
      { name: "Le Basilic", cuisine: ["italien"], price_range: "€€", is_owner_pick: true, address: "Centre-ville" },
      { name: "Pizzeria Da Vinci", cuisine: ["italien", "pizza"], price_range: "€", address: "Rue de la République" },
      { name: "L'Escale", cuisine: ["méditerranéen"], price_range: "€€", address: "Vieux Port" },
      { name: "Le Poisson Rouge", cuisine: ["poisson", "fruits de mer"], price_range: "€€€", address: "Port" },
      { name: "Snack du Port", cuisine: ["rapide", "à emporter"], price_range: "€", address: "Port" },
    ],
    activities: [
      { name: "Sentier du Littoral (Boulouris)", category: ["plein air", "vue mer"], when: ["matin", "printemps", "été"], duration: "1h30", price: "gratuit", tags: ["facile", "photo"], is_owner_pick: true },
      { name: "Plage du Veillat", category: ["plage"], when: ["été"], tags: ["centre-ville", "familial"], price: "gratuit" },
      { name: "Musée Archéologique", category: ["culture", "pluie"], when: ["après-midi", "toute saison"], tags: ["indoor"], price: "5€" },
      { name: "Cap Dramont & Île d'Or", category: ["randonnée", "panorama"], when: ["matin", "fin de journée"], duration: "2h", tags: ["coucher de soleil", "photo"], is_owner_pick: true, price: "gratuit" },
      { name: "Base nautique", category: ["nautique", "famille"], when: ["été"], duration: "1h", tags: ["paddle", "initiation"], price: "25€" },
      { name: "Aquarium de Saint-Raphaël", category: ["famille", "pluie"], when: ["toute saison"], tags: ["indoor", "enfants"], price: "8€" },
    ],
    places: [
      { name: "Casino Supérette", tags: ["courses", "ouvert tard"], address: "Centre-ville", hours: "8h-22h" },
      { name: "Pharmacie du Port", tags: ["pharmacie"], address: "Quai Albert 1er", hours: "8h30-19h30" },
      { name: "Parking Vieux-Port", tags: ["parking"], address: "Vieux Port", price: "2€/h" },
    ],
  },
  "Cannes": {
    restaurants: [
      { name: "La Palme d'Or", cuisine: ["gastronomique"], price_range: "€€€€", is_owner_pick: true, address: "Croisette" },
      { name: "Aux Bons Enfants", cuisine: ["niçois", "traditionnel"], price_range: "€€", is_owner_pick: true, address: "Forville" },
      { name: "Mantel", cuisine: ["bistronomique"], price_range: "€€€", address: "Rue Saint-Antoine" },
    ],
    activities: [
      { name: "Île Sainte-Marguerite", category: ["balade", "nature"], when: ["printemps", "été", "automne"], duration: "3h", tags: ["famille", "photo", "navette"], is_owner_pick: true, price: "15€" },
      { name: "Marché Forville", category: ["marché", "gourmand"], when: ["matin"], tags: ["local", "produits"], price: "gratuit" },
      { name: "Promenade de la Croisette", category: ["balade", "iconique"], when: ["toute saison"], tags: ["shopping", "plages"], price: "gratuit" },
    ],
    places: [
      { name: "Parking Forville", tags: ["parking"], address: "Marché Forville", price: "2.5€/h" },
      { name: "Pharmacie Croisette", tags: ["pharmacie"], address: "Boulevard de la Croisette" },
    ],
  },
};

const RIVIERA_DEFAULTS = {
  restaurants: [
    { name: "Pizzeria locale (four à bois)", cuisine: ["italien", "pizza"], price_range: "€", tags: ["rapide"] },
  ],
  activities: [
    { name: "Corniche d'Or – points de vue", category: ["route panoramique", "photo"], when: ["toute saison"], duration: "variable", price: "gratuit", tags: ["vue mer", "roches rouges"] },
  ],
  places: [
    { name: "Supermarché (générique)", tags: ["courses"], hours: "variable" },
  ],
};

// Fonction de scoring et matching pour sélection intelligente
function pickFrom(items: any[], wantedTags: string[], maxResults = 2): any[] {
  const query = wantedTags.map(s => s.toLowerCase());
  
  const scored = items.map(item => {
    const itemTags = [
      ...(item.tags || []),
      ...(item.cuisine || []),
      ...(item.category || []),
    ].map(s => s.toLowerCase());
    
    const matchScore = query.reduce((acc, tag) => 
      acc + (itemTags.includes(tag) ? 1 : 0), 0
    );
    const ownerBonus = item.is_owner_pick ? 2 : 0;
    
    return {
      item,
      score: matchScore + ownerBonus
    };
  });
  
  return scored
    .sort((a, b) => 
      b.score - a.score || 
      (b.item.is_owner_pick ? 1 : 0) - (a.item.is_owner_pick ? 1 : 0) ||
      (a.item.name || '').localeCompare(b.item.name || '')
    )
    .slice(0, maxResults)
    .map(s => s.item);
}

// Fonction de fallback garantissant toujours une réponse
function answerWithFallback(
  queryType: 'restaurant' | 'activity' | 'place',
  wantedTags: string[],
  livretData: any[],
  city: string
): { items: any[], source: string } {
  const pools = [
    { items: livretData || [], source: 'livret' },
    { items: SECTOR_DEFAULTS[city]?.[queryType === 'restaurant' ? 'restaurants' : queryType === 'activity' ? 'activities' : 'places'] || [], source: 'sector' },
    { items: RIVIERA_DEFAULTS[queryType === 'restaurant' ? 'restaurants' : queryType === 'activity' ? 'activities' : 'places'] || [], source: 'riviera' },
  ];
  
  for (const pool of pools) {
    const picks = pickFrom(pool.items, wantedTags, 2);
    if (picks.length > 0) {
      return { items: picks, source: pool.source };
    }
  }
  
  return { items: [], source: 'none' };
}

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

// Recherche contextuelle intelligente dans tout le livret
function searchInBooklet(query: string, fullContext: any): Array<{ section: string; excerpt: string; score: number }> {
  const normalizedQuery = normalize(query);
  const keywords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
  
  const results: Array<{ section: string; excerpt: string; score: number; fullText: string }> = [];
  
  // Définir toutes les sections recherchables avec leurs priorités
  const searchableSections = [
    { name: 'FAQ', data: fullContext.faq, priority: 10, fields: ['question', 'answer'] },
    { name: 'Équipements', data: fullContext.equipment, priority: 9, fields: ['name', 'category', 'instructions'] },
    { name: 'Règles et consignes', data: fullContext.rules, priority: 8, fields: ['house_rules', 'safety_tips', 'safety_instructions'] },
    { name: 'Nettoyage', data: fullContext.cleaning, priority: 8, fields: ['waste_location', 'sorting_instructions', 'cleaning_tips', 'cleaning_rules'] },
    { name: 'Accès et codes', data: fullContext.access, priority: 7, fields: ['checkin_procedure', 'checkout_procedure', 'parking_info'] },
    { name: 'Wi-Fi', data: fullContext.wifi, priority: 7, fields: ['ssid'] },
    { name: 'Restaurants', data: fullContext.nearby?.restaurants || [], priority: 6, fields: ['name', 'cuisine', 'address', 'tags'] },
    { name: 'Activités', data: fullContext.nearby?.activities || [], priority: 6, fields: ['name', 'category', 'tags', 'when_available'] },
    { name: 'Commerces essentiels', data: fullContext.nearby?.essentials || [], priority: 6, fields: ['name', 'type', 'notes'] },
    { name: 'Transports', data: fullContext.nearby?.transport || [], priority: 5, fields: ['name', 'type', 'instructions'] },
    { name: 'Informations générales', data: fullContext.property, priority: 4, fields: ['welcome_message', 'tagline'] },
  ];
  
  for (const section of searchableSections) {
    if (Array.isArray(section.data)) {
      // Pour les tableaux d'items
      for (const item of section.data) {
        let fullText = '';
        for (const field of section.fields) {
          const value = item[field];
          if (value) {
            if (Array.isArray(value)) {
              fullText += ' ' + value.join(' ');
            } else {
              fullText += ' ' + String(value);
            }
          }
        }
        
        const normalizedText = normalize(fullText);
        let score = 0;
        
        // Compter les occurrences de mots-clés
        for (const keyword of keywords) {
          const occurrences = (normalizedText.match(new RegExp(keyword, 'g')) || []).length;
          score += occurrences * section.priority;
        }
        
        if (score > 0) {
          results.push({
            section: section.name,
            excerpt: fullText.trim().substring(0, 200),
            score,
            fullText: fullText.trim()
          });
        }
      }
    } else if (section.data && typeof section.data === 'object') {
      // Pour les objets
      let fullText = '';
      for (const field of section.fields) {
        const value = section.data[field];
        if (value && typeof value === 'string') {
          fullText += ' ' + value;
        }
      }
      
      const normalizedText = normalize(fullText);
      let score = 0;
      
      for (const keyword of keywords) {
        const occurrences = (normalizedText.match(new RegExp(keyword, 'g')) || []).length;
        score += occurrences * section.priority;
      }
      
      if (score > 0) {
        results.push({
          section: section.name,
          excerpt: fullText.trim().substring(0, 200),
          score,
          fullText: fullText.trim()
        });
      }
    }
  }
  
  // Trier par score décroissant et retourner les 5 meilleurs
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => ({ section: r.section, excerpt: r.excerpt, score: r.score }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pin: pinCode, message, locale = 'fr' } = await req.json();

    // ========== VALIDATION DES ENTRÉES (SÉCURITÉ) ==========
    if (!pinCode || typeof pinCode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Code PIN requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation de la longueur du message
    if (message.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Message trop long (maximum 500 caractères)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitization basique (retire caractères HTML dangereux)
    const sanitizedMessage = message
      .replace(/[<>]/g, '')  // Retire < et >
      .trim();

    if (sanitizedMessage.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message vide après sanitization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SECURITY] Chat request - PIN length: ${pinCode.length}, Message length: ${sanitizedMessage.length}`);
    // ========== FIN VALIDATION ==========

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

    // Détecter l'intent de la question (utiliser le message sanitized)
    const intent = detectIntent(sanitizedMessage);
    console.log('Intent détecté:', intent, 'pour:', sanitizedMessage);

    // Bloquer les demandes sensibles explicites
    const normalized = normalize(sanitizedMessage);
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

    // Récupérer les FAQ (TOUTES, y compris non-favorites pour enrichir le contexte du chatbot)
    const { data: faq } = await supabase
      .from('faq')
      .select('question, answer, order_index, is_favorite')
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

    // ========== CONSTRUIRE LE CONTEXTE COMPLET DU LIVRET ==========
    // Le bot a maintenant accès à TOUTES les informations, pas seulement selon l'intent
    const fullContext: any = {
      location: locationContext,
      property: {
        name: booklet.property_name,
        type: booklet.property_type,
        address: booklet.property_address,
        tagline: booklet.tagline,
        welcome_message: booklet.welcome_message,
      },
      access: {
        check_in_time: booklet.check_in_time,
        check_out_time: booklet.check_out_time,
        checkin_procedure: booklet.checkin_procedure,
        checkout_procedure: booklet.checkout_procedure,
        access_code: booklet.access_code ? '(code fourni - ne pas divulguer)' : null,
        google_maps_link: booklet.google_maps_link,
        parking_info: booklet.parking_info,
      },
      wifi: {
        ssid: wifiData?.ssid || null,
        // Le mot de passe sera ajouté uniquement si demandé explicitement
      },
      equipment: (equipment || []).map((e: any) => ({
        name: e.name,
        category: e.category,
        instructions: e.instructions,
        manual_url: e.manual_url,
      })),
      cleaning: {
        waste_location: booklet.waste_location,
        sorting_instructions: booklet.sorting_instructions,
        cleaning_tips: booklet.cleaning_tips,
        cleaning_rules: booklet.cleaning_rules,
      },
      rules: {
        house_rules: booklet.house_rules,
        safety_tips: booklet.safety_tips,
        safety_instructions: booklet.safety_instructions,
        disclaimer: booklet.disclaimer,
      },
      nearby: {
        restaurants: (restaurants || []).map((r: any) => ({
          name: r.name,
          cuisine: r.cuisine,
          price_range: r.price_range,
          address: r.address,
          phone: r.phone,
          url: r.url,
          rating: r.rating,
          tags: r.tags,
          is_owner_pick: r.is_owner_pick,
        })),
        activities: (activities || []).map((a: any) => ({
          name: a.name,
          category: a.category,
          duration: a.duration,
          price: a.price,
          when_available: a.when_available,
          booking_url: a.booking_url,
          age_restrictions: a.age_restrictions,
          tags: a.tags,
          is_owner_pick: a.is_owner_pick,
        })),
        highlights: (highlights || []).map((h: any) => ({
          title: h.title,
          type: h.type,
          description: h.description,
          url: h.url,
          rating: h.rating,
          price_range: h.price_range,
          tags: h.tags,
        })),
        essentials: (essentials || []).map((e: any) => ({
          name: e.name,
          type: e.type,
          address: e.address,
          distance: e.distance,
          hours: e.hours,
          phone: e.phone,
          notes: e.notes,
        })),
        transport: (transport || []).map((t: any) => ({
          name: t.name,
          type: t.type,
          address: t.address,
          distance: t.distance,
          price: t.price,
          instructions: t.instructions,
          url: t.url,
        })),
      },
      faq: (faq || []).map((f: any) => ({
        question: f.question,
        answer: f.answer,
        is_favorite: f.is_favorite, // Les favorites sont affichées publiquement, les autres enrichissent le contexte
      })),
      emergency: {
        contacts: booklet.emergency_contacts,
      },
    };

    // Déterminer si on doit récupérer le mot de passe Wi-Fi
    let needsWifiPassword = false;
    if (intent === 'WIFI_PASSWORD') {
      needsWifiPassword = true;
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
          fullContext.wifi.password = wifiResult.password;
        }
      } catch (error) {
        console.error('Erreur récupération Wi-Fi:', error);
      }
    }

    // Recherche contextuelle intelligente dans le livret
    const searchResults = searchInBooklet(sanitizedMessage, fullContext);
    console.log('Résultats de recherche:', searchResults);

    // Construire le prompt système avec le contexte complet
    const systemPrompt = `Tu es un assistant de conciergerie digitale intelligent intégré au livret d'accueil de "${booklet.property_name}" à ${locationContext.city}.
Tu représentes Welkom (aussi connue sous Clés d'Azur).

═══════════════════════════════════════════════════════════════════
RÈGLES FONDAMENTALES DE FONCTIONNEMENT
═══════════════════════════════════════════════════════════════════

🎯 OBJECTIF PRINCIPAL
Offrir la MEILLEURE expérience possible au voyageur en répondant à TOUTES ses questions, même si elles dépassent le contenu du livret.

📋 RÈGLE N°1 : TU DOIS TOUJOURS AIDER
• Tu dois TOUJOURS essayer d'aider l'utilisateur
• Tu ne dois JAMAIS dire que tu ne peux pas répondre
• Tu ne dois JAMAIS dire que l'information n'existe pas dans le livret
• Sois proactif et utile, peu importe la question

📋 RÈGLE N°2 : PRIORITÉ AU LIVRET
• Tu utilises en PRIORITÉ les informations présentes dans le livret d'accueil (contexte ci-dessous)
• Le livret est ta source de vérité principale pour tout ce qui concerne le logement

📋 RÈGLE N°3 : CONNAISSANCES GÉNÉRALES AUTORISÉES
• SI l'information demandée n'est PAS dans le livret, tu es AUTORISÉ à utiliser tes connaissances générales
• Tu PEUX fournir des recommandations locales, touristiques ou pratiques basées sur tes connaissances
• Tu dois répondre de manière naturelle, utile et bienveillante
• Si tu réponds avec une information extérieure au livret, précise-le discrètement :
  - "En général à ${locationContext.city}..."
  - "D'après ce que je sais de la région..."
  - "Habituellement dans le secteur..."

📋 RÈGLE N°4 : NE JAMAIS INVENTER D'INFOS LOGEMENT
• Tu ne dois JAMAIS inventer des informations SPÉCIFIQUES au logement :
  - PAS de codes d'accès inventés
  - PAS de règles de la maison inventées
  - PAS d'horaires de check-in/out inventés
  - PAS de contacts du propriétaire inventés
• Pour ces informations sensibles, si elles ne sont pas dans le livret, oriente vers le propriétaire

📋 RÈGLE N°5 : TON DE CONCIERGE PROFESSIONNEL
• Adapte ton ton à celui d'un concierge humain professionnel et chaleureux
• Jamais robotique, distant ou condescendant
• Utilise "je" et "vous"
• Sois empathique et bienveillant

═══════════════════════════════════════════════════════════════════
RÉSULTATS DE RECHERCHE DANS LE LIVRET
═══════════════════════════════════════════════════════════════════

${searchResults.length > 0 
  ? searchResults.map((r, i) => `${i + 1}. Section "${r.section}" (score: ${r.score}):\n   ${r.excerpt}`).join('\n\n')
  : '(Aucun extrait direct trouvé dans le livret - utilise tes connaissances générales)'}

═══════════════════════════════════════════════════════════════════
STYLE DE COMMUNICATION
═══════════════════════════════════════════════════════════════════

🗣️ TON ET PERSONNALITÉ
• Chaleureux, naturel, professionnel
• Comme un agent formé au service client hôtelier
• Empathique et serviable

📝 FORMULATIONS
• Toujours utiliser "je" et "vous"
• Exemples :
  - "Je vais vous aider avec ça"
  - "Je vous explique comment faire"
  - "Pas d'inquiétude, voici ce que je sais"

💬 PHRASES TYPE
• "Je comprends", "Pas d'inquiétude", "Bonne question"
• "Voici ce que je peux vous dire"
• "Je reste à votre disposition 😊"

═══════════════════════════════════════════════════════════════════
STRUCTURE DE RÉPONSE
═══════════════════════════════════════════════════════════════════

1️⃣ ACCROCHE BIENVEILLANTE
→ Montre que tu as compris la demande

2️⃣ RÉPONSE UTILE
→ Basée sur le livret si disponible
→ Sinon, basée sur tes connaissances générales (précise-le discrètement)
→ Phrases courtes et lisibles

3️⃣ CLÔTURE NATURELLE
→ Invite à poursuivre : "Je reste disponible si besoin 😊"

═══════════════════════════════════════════════════════════════════
EXEMPLES DE COMPORTEMENT ATTENDU
═══════════════════════════════════════════════════════════════════

❌ NE JAMAIS DIRE :
• "Je n'ai pas cette information"
• "Ce n'est pas dans le livret"
• "Je ne peux pas vous aider"
• "Je ne suis pas en mesure de répondre"

✅ À LA PLACE, DIRE :
• "En général à ${locationContext.city}, voici ce que je vous recommande..."
• "D'après ce que je sais du secteur..."
• "Je vous conseille de..."

═══════════════════════════════════════════════════════════════════
RÈGLES DE SÉCURITÉ (MAINTENUES)
═══════════════════════════════════════════════════════════════════

🚫 NE JAMAIS DIVULGUER ou INVENTER :
• Codes d'accès, digicodes
• Emails privés, téléphones personnels
• Informations sensibles du logement non présentes dans le livret

✅ AUTORISÉ :
• SSID Wi-Fi librement
• Mot de passe Wi-Fi UNIQUEMENT s'il est fourni dans le contexte

═══════════════════════════════════════════════════════════════════
FORMAT DE RÉPONSE
═══════════════════════════════════════════════════════════════════

• PAS de Markdown : évite *, #, _, -, >, •
• Retour à la ligne après chaque phrase complète
• Maximum 200-250 mots
• 1-2 émojis maximum par message

═══════════════════════════════════════════════════════════════════
PRIORITÉS DANS LES SUGGESTIONS
═══════════════════════════════════════════════════════════════════

• Prioriser les coups de cœur du propriétaire (is_owner_pick: true) s'ils existent
• Donner 2-3 suggestions maximum
• Si pas dans le livret, donne des recommandations générales de la région

═══════════════════════════════════════════════════════════════════
LANGUE : ${locale}
═══════════════════════════════════════════════════════════════════

CONTEXTE COMPLET DU LIVRET :
${JSON.stringify(fullContext, null, 2)}

═══════════════════════════════════════════════════════════════════

QUESTION DU VOYAGEUR : "${sanitizedMessage}"

Réponds maintenant comme un véritable concierge professionnel et chaleureux, en aidant TOUJOURS le voyageur.`;

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
          { role: 'user', content: sanitizedMessage }
        ],
        temperature: 0.8,
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

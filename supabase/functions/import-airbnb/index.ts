import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AirbnbImportResult {
  success: boolean;
  data?: {
    title?: string;
    description?: string;
    addressApprox?: string;
    city?: string;
    photos?: string[];
    amenities?: Array<{ category: string; items: string[] }>;
    houseRules?: {
      checkInFrom?: string;
      checkOutBefore?: string;
      quietHours?: string;
      pets?: boolean;
      smoking?: boolean;
      parties?: boolean;
    };
    maxGuests?: number;
    beds?: number;
    bathrooms?: number;
    spaces?: string[];
    host?: { name?: string; superhost?: boolean };
    neighborhood?: string;
    wifi?: { note?: string };
  };
  error?: string;
  method?: 'scrape' | 'fallback';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, fallbackText, mode, bookletId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Import Airbnb request:', { url, mode, hasFallbackText: !!fallbackText, bookletId });

    // Mode fallback: l'utilisateur a collé le texte de l'annonce
    if (mode === 'fallback' && fallbackText) {
      console.log('Using fallback text mode');
      const aiResult = await extractFromText(fallbackText, LOVABLE_API_KEY);
      
      // Télécharger et stocker les photos si un bookletId est fourni
      if (bookletId && aiResult.photos?.length > 0) {
        aiResult.photos = await downloadAndStorePhotos(aiResult.photos, bookletId);
      }
      
      return new Response(
        JSON.stringify({ success: true, data: aiResult, method: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode scrape: tentative de récupération de la page Airbnb
    if (!url || !url.includes('airbnb.')) {
      throw new Error('URL Airbnb invalide');
    }

    console.log('Attempting to fetch Airbnb page');
    const htmlContent = await fetchAirbnbPage(url);
    
    if (!htmlContent) {
      console.log('Failed to fetch page, returning fallback instruction');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'blocked',
          message: 'Airbnb bloque l\'accès automatique. Veuillez utiliser le mode fallback (coller le texte de l\'annonce).'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Page fetched successfully, extracting data with AI');
    const extractedData = await extractFromHTML(htmlContent, LOVABLE_API_KEY);

    // Télécharger et stocker les photos si un bookletId est fourni
    if (bookletId && extractedData.photos?.length > 0) {
      extractedData.photos = await downloadAndStorePhotos(extractedData.photos, bookletId);
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData, method: 'scrape' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function fetchAirbnbPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok || response.status === 403) {
      console.log('Fetch failed:', response.status);
      return null;
    }

    const html = await response.text();
    console.log('HTML fetched, length:', html.length);
    return html;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

async function extractFromHTML(html: string, apiKey: string): Promise<any> {
  const prompt = `Tu es un expert en extraction de données d'annonces Airbnb. 
Analyse ce HTML et extrais les informations suivantes au format JSON strictement structuré:

{
  "title": "titre du logement",
  "description": "description résumée en 2-3 paragraphes",
  "addressApprox": "ville/quartier approximatif (PAS d'adresse exacte)",
  "city": "ville",
  "photos": ["url1", "url2", ...] (6-12 photos principales),
  "amenities": [
    { "category": "Cuisine", "items": ["Four", "Micro-ondes", ...] },
    { "category": "Salle de bain", "items": ["Sèche-cheveux", ...] },
    { "category": "Sécurité", "items": ["Détecteur de fumée", ...] }
  ],
  "houseRules": {
    "checkInFrom": "15:00",
    "checkOutBefore": "11:00",
    "quietHours": "22:00-08:00",
    "pets": false,
    "smoking": false,
    "parties": false
  },
  "maxGuests": 4,
  "beds": 2,
  "bathrooms": 1,
  "spaces": ["2 chambres", "terrasse", ...],
  "host": { "name": "nom", "superhost": true },
  "neighborhood": "description du quartier en 2-3 phrases",
  "wifi": { "note": "informations wifi si mentionnées" }
}

Règles strictes:
- Si un champ est absent, retourne null ou tableau vide
- Résume la description (max 300 mots)
- Normalise les équipements en français
- Les heures en format HH:MM
- Sois précis et factuel

HTML à analyser (tronqué si trop long):
${html.slice(0, 50000)}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un assistant qui extrait des données structurées. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    // Extraire le JSON du contenu (parfois enveloppé dans ```json```)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    
    const extracted = JSON.parse(jsonStr);
    console.log('Data extracted successfully');
    return extracted;
  } catch (error) {
    console.error('AI extraction error:', error);
    return {};
  }
}

async function extractFromText(text: string, apiKey: string): Promise<any> {
  const prompt = `Tu es un expert en extraction de données d'annonces de logement. 
L'utilisateur a copié-collé le texte d'une annonce Airbnb. Extrais les informations au format JSON:

{
  "title": "titre du logement",
  "description": "description résumée",
  "addressApprox": "ville/quartier",
  "city": "ville",
  "amenities": [
    { "category": "Cuisine", "items": ["Four", ...] },
    { "category": "Chambre", "items": ["Lit double", ...] }
  ],
  "houseRules": {
    "checkInFrom": "15:00",
    "checkOutBefore": "11:00",
    "pets": false,
    "smoking": false
  },
  "maxGuests": 4,
  "beds": 2,
  "bathrooms": 1,
  "spaces": ["2 chambres", "terrasse"],
  "neighborhood": "description quartier"
}

Règles:
- Si un champ est absent, null ou []
- Résume description (max 300 mots)
- Normalise en français
- Heures en HH:MM

Texte à analyser:
${text.slice(0, 30000)}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un assistant qui extrait des données structurées. Réponds UNIQUEMENT en JSON valide.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Text extraction error:', error);
    return {};
  }
}

async function downloadAndStorePhotos(photoUrls: string[], bookletId: string): Promise<string[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const storedUrls: string[] = [];
  
  console.log(`Starting to download ${photoUrls.length} photos for booklet ${bookletId}`);
  
  // Limiter à 12 photos max
  const photosToDownload = photoUrls.slice(0, 12);
  
  for (let i = 0; i < photosToDownload.length; i++) {
    try {
      const photoUrl = photosToDownload[i];
      console.log(`Downloading photo ${i + 1}/${photosToDownload.length}: ${photoUrl}`);
      
      // Télécharger l'image
      const imageResponse = await fetch(photoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });
      
      if (!imageResponse.ok) {
        console.error(`Failed to download photo ${i + 1}: ${imageResponse.status}`);
        continue;
      }
      
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Détecter l'extension
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      
      // Nom de fichier unique
      const fileName = `${bookletId}/airbnb-import-${Date.now()}-${i}.${ext}`;
      
      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('booklet-images')
        .upload(fileName, uint8Array, {
          contentType,
          upsert: false,
        });
      
      if (uploadError) {
        console.error(`Upload error for photo ${i + 1}:`, uploadError);
        continue;
      }
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = supabase.storage
        .from('booklet-images')
        .getPublicUrl(fileName);
      
      storedUrls.push(publicUrlData.publicUrl);
      console.log(`Photo ${i + 1} uploaded successfully: ${publicUrlData.publicUrl}`);
      
    } catch (error) {
      console.error(`Error processing photo ${i + 1}:`, error);
    }
  }
  
  console.log(`Successfully stored ${storedUrls.length}/${photosToDownload.length} photos`);
  return storedUrls;
}

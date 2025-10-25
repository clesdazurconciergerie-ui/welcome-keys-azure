import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await req.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'ID du livret manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership and get booklet with ALL fields (including drafts)
    const { data: booklet, error: bookletError } = await supabase
      .from('booklets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (bookletError || !booklet) {
      return new Response(
        JSON.stringify({ error: 'Livret non trouvé ou accès refusé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch WiFi credentials (including password for creator)
    const { data: wifi } = await supabase
      .from('wifi_credentials')
      .select('*')
      .eq('booklet_id', booklet.id)
      .maybeSingle();

    // Fetch equipment
    const { data: equipment } = await supabase
      .from('equipment')
      .select('*')
      .eq('booklet_id', booklet.id)
      .order('created_at');

    // Fetch nearby places
    const { data: nearbyPlaces } = await supabase
      .from('nearby_places')
      .select('*')
      .eq('booklet_id', booklet.id)
      .order('created_at');

    // Fetch contacts (private data visible to creator)
    const { data: contacts } = await supabase
      .from('booklet_contacts')
      .select('*')
      .eq('booklet_id', booklet.id)
      .maybeSingle();

    // Fetch FAQ
    const { data: faq } = await supabase
      .from('faq')
      .select('*')
      .eq('booklet_id', booklet.id)
      .order('order_index');

    // Build complete response for creator (all fields including private)
    const response = {
      booklet: {
        ...booklet,
        wifi_credentials: wifi || null,
        equipment: equipment || [],
        nearby_places: nearbyPlaces || [],
        contacts: contacts || null,
        faq: faq || []
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

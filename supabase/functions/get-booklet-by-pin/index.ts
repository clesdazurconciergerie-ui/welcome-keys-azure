import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 's-maxage=120',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // Use service role key to bypass RLS and access published booklets
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get PIN code from URL and normalize
    const url = new URL(req.url);
    const rawPinCode = url.pathname.split('/').pop();
    
    console.log('Raw PIN code:', rawPinCode);
    
    if (!rawPinCode) {
      return new Response(
        JSON.stringify({ error: 'Code PIN manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize PIN: trim, remove spaces, uppercase
    const pinCode = rawPinCode.replace(/\s+/g, '').toUpperCase();

    console.log('Normalized PIN:', pinCode);

    // Find active PIN
    const { data: pins, error: pinError } = await supabase
      .from('pins')
      .select('booklet_id, status, pin_code')
      .eq('pin_code', pinCode)
      .eq('status', 'active');

    console.log('PIN query result:', { pins, pinError, count: pins?.length });

    if (pinError) {
      console.error('PIN query error:', pinError);
      return new Response(
        JSON.stringify({ error: 'Erreur de recherche du code', details: pinError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pins || pins.length === 0) {
      console.log('No PIN found for code:', pinCode);
      return new Response(
        JSON.stringify({ error: 'Code invalide ou désactivé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pin = pins[0];
    console.log('Found PIN:', pin);

    // Get published booklet - only public fields (wifi and contacts moved to separate tables)
    const { data: booklet, error: bookletError } = await supabase
      .from('booklets')
      .select(`
        id,
        property_name,
        property_address,
        property_type,
        welcome_message,
        cover_image_url,
        check_in_time,
        check_out_time,
        house_rules,
        emergency_contacts,
        amenities,
        nearby,
        gallery,
        chatbot_enabled,
        chatbot_config
      `)
      .eq('id', pin.booklet_id)
      .eq('status', 'published')
      .maybeSingle();

    console.log('Booklet query result:', { booklet: booklet?.id, bookletError });

    if (bookletError) {
      console.error('Booklet query error:', bookletError);
      return new Response(
        JSON.stringify({ error: 'Erreur de récupération du livret', details: bookletError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!booklet) {
      console.log('Booklet not found or not published for ID:', pin.booklet_id);
      return new Response(
        JSON.stringify({ error: 'Livret non trouvé ou non publié' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully returning booklet:', booklet.property_name);

    return new Response(
      JSON.stringify({ booklet }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Une erreur est survenue';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

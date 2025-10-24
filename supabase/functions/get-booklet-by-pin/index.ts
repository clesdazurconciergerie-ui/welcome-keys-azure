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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get PIN code from URL and normalize
    const url = new URL(req.url);
    const rawPinCode = url.pathname.split('/').pop();
    
    if (!rawPinCode) {
      return new Response(
        JSON.stringify({ error: 'Code PIN manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize PIN: trim, remove spaces, uppercase
    const pinCode = rawPinCode.replace(/\s+/g, '').toUpperCase();

    console.log('Looking for PIN:', pinCode);

    // Find active PIN
    const { data: pin, error: pinError } = await supabase
      .from('pins')
      .select('booklet_id')
      .eq('pin_code', pinCode)
      .eq('status', 'active')
      .maybeSingle();

    if (pinError || !pin) {
      console.log('PIN not found or error:', pinError);
      return new Response(
        JSON.stringify({ error: 'Code invalide ou désactivé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get published booklet - only public fields
    const { data: booklet, error: bookletError } = await supabase
      .from('booklets')
      .select(`
        id,
        property_name,
        property_address,
        property_type,
        welcome_message,
        cover_image_url,
        wifi_name,
        wifi_password,
        check_in_time,
        check_out_time,
        house_rules,
        emergency_contacts,
        contact_phone,
        contact_email,
        amenities,
        nearby,
        gallery,
        chatbot_enabled,
        chatbot_config
      `)
      .eq('id', pin.booklet_id)
      .eq('status', 'published')
      .maybeSingle();

    if (bookletError || !booklet) {
      console.log('Booklet not found or not published:', bookletError);
      return new Response(
        JSON.stringify({ error: 'Livret non trouvé ou non publié' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ booklet }),
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

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

    // Get booklet ID from URL
    const url = new URL(req.url);
    const bookletId = url.pathname.split('/').pop();

    if (!bookletId) {
      return new Response(
        JSON.stringify({ error: 'ID du livret manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    const { data: booklet, error: bookletError } = await supabase
      .from('booklets')
      .select('*')
      .eq('id', bookletId)
      .eq('user_id', user.id)
      .single();

    if (bookletError || !booklet) {
      return new Response(
        JSON.stringify({ error: 'Livret non trouvé ou accès refusé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update booklet status to published
    const { error: updateError } = await supabase
      .from('booklets')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', bookletId);

    if (updateError) {
      throw updateError;
    }

    // Check if there's already an active PIN
    const { data: existingPin } = await supabase
      .from('pins')
      .select('*')
      .eq('booklet_id', bookletId)
      .eq('status', 'active')
      .maybeSingle();

    let pinCode = existingPin?.pin_code;

    // Generate new PIN if none exists
    if (!existingPin) {
      const { data: newPinCode, error: pinError } = await supabase
        .rpc('generate_unique_pin');

      if (pinError) {
        throw pinError;
      }

      pinCode = newPinCode;

      // Insert new PIN
      const { error: insertError } = await supabase
        .from('pins')
        .insert({
          booklet_id: bookletId,
          pin_code: pinCode,
          status: 'active'
        });

      if (insertError) {
        throw insertError;
      }
    }

    // Construire l'URL publique complète
    const origin = req.headers.get('origin') || 'https://welkom.clezazur.fr';
    const viewUrl = `${origin}/view/${pinCode}`;

    return new Response(
      JSON.stringify({ 
        success: true,
        code: pinCode,
        viewUrl 
      }),
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

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

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorisation requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
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
      .select('user_id, status')
      .eq('id', bookletId)
      .single();

    if (bookletError || !booklet) {
      return new Response(
        JSON.stringify({ error: 'Livret non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (booklet.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (booklet.status !== 'published') {
      return new Response(
        JSON.stringify({ error: 'Le livret doit être publié' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Disable old PIN
    const { error: disableError } = await supabase
      .from('pins')
      .update({ status: 'disabled' })
      .eq('booklet_id', bookletId)
      .eq('status', 'active');

    if (disableError) {
      console.error('Error disabling old PIN:', disableError);
    }

    // Generate new PIN
    const { data: newPinCode, error: rpcError } = await supabase
      .rpc('generate_unique_pin');

    if (rpcError || !newPinCode) {
      console.error('Error generating PIN:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la génération du code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new PIN
    const { error: insertError } = await supabase
      .from('pins')
      .insert([{
        booklet_id: bookletId,
        pin_code: newPinCode,
        status: 'active'
      }]);

    if (insertError) {
      console.error('Error inserting new PIN:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du nouveau code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PIN regenerated successfully for booklet:', bookletId);

    return new Response(
      JSON.stringify({ 
        pin_code: newPinCode,
        view_url: `/view/${newPinCode}`
      }),
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

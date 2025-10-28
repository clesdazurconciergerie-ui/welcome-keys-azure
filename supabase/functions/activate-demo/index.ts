import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already used demo
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('has_used_demo, role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return new Response(
        JSON.stringify({ error: 'Error fetching user data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userData.has_used_demo) {
      return new Response(
        JSON.stringify({ error: 'Demo already used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Activate demo mode
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        role: 'demo_user',
        demo_token_issued_at: now.toISOString(),
        demo_token_expires_at: expiresAt.toISOString(),
        has_used_demo: true,
        subscription_status: 'trial_active',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error activating demo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Also add role to user_roles table for security
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .upsert(
        {
          user_id: user.id,
          role: 'demo_user',
          assigned_at: now.toISOString(),
        },
        {
          onConflict: 'user_id,role',
          ignoreDuplicates: true,
        }
      );

    if (roleError) {
      console.error('Error adding role to user_roles:', roleError);
      // Don't fail the request, just log the error
    }

    // Create or reactivate demo booklet
    const { data: existingDemoBooklet, error: bookletFetchError } = await supabaseClient
      .from('booklets')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_demo', true)
      .maybeSingle();

    if (bookletFetchError) {
      console.error('Error fetching demo booklet:', bookletFetchError);
    }

    let bookletId: string | null = null;

    if (existingDemoBooklet) {
      // Reactivate existing demo booklet
      const { error: updateBookletError } = await supabaseClient
        .from('booklets')
        .update({
          status: 'published',
          demo_expires_at: expiresAt.toISOString()
        })
        .eq('id', existingDemoBooklet.id);

      if (updateBookletError) {
        console.error('Error updating demo booklet:', updateBookletError);
      } else {
        bookletId = existingDemoBooklet.id;
      }
    } else {
      // Create new demo booklet
      const { data: newBooklet, error: createBookletError } = await supabaseClient
        .from('booklets')
        .insert({
          user_id: user.id,
          property_name: 'Mon Livret de Démonstration',
          property_address: '123 Rue de la Démo, 06000 Nice',
          tagline: 'Découvrez toutes les fonctionnalités',
          status: 'published',
          is_demo: true,
          demo_expires_at: expiresAt.toISOString(),
          welcome_message: 'Bienvenue dans votre livret de démonstration ! Vous avez 7 jours pour explorer toutes les fonctionnalités de Wlekom.',
          check_in_time: '15:00',
          check_out_time: '11:00'
        })
        .select('id')
        .single();

      if (createBookletError) {
        console.error('Error creating demo booklet:', createBookletError);
      } else {
        bookletId = newBooklet.id;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo mode activated',
        expires_at: expiresAt.toISOString(),
        booklet_id: bookletId,
        days_remaining: 7
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in activate-demo function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

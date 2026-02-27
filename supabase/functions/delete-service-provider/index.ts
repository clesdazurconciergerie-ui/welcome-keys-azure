import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { service_provider_id } = await req.json();
    if (!service_provider_id) {
      return new Response(JSON.stringify({ error: 'ID manquant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get SP record
    const { data: sp, error: spError } = await adminClient
      .from('service_providers')
      .select('id, auth_user_id, concierge_user_id')
      .eq('id', service_provider_id)
      .single();

    if (spError || !sp) {
      return new Response(JSON.stringify({ error: 'Prestataire non trouvé' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (sp.concierge_user_id !== caller.id) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete cleaning photos for their interventions
    const { data: interventions } = await adminClient
      .from('cleaning_interventions')
      .select('id')
      .eq('service_provider_id', service_provider_id);

    if (interventions?.length) {
      const ids = interventions.map((i: any) => i.id);
      await adminClient.from('cleaning_photos').delete().in('intervention_id', ids);
      await adminClient.from('cleaning_interventions').delete().eq('service_provider_id', service_provider_id);
    }

    // Delete SP record
    await adminClient.from('service_providers').delete().eq('id', service_provider_id);

    // Delete auth user + public.users
    if (sp.auth_user_id) {
      await adminClient.from('user_roles').delete().eq('user_id', sp.auth_user_id);
      await adminClient.from('users').delete().eq('id', sp.auth_user_id);
      await adminClient.auth.admin.deleteUser(sp.auth_user_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('delete-service-provider error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { owner_id } = await req.json();
    if (!owner_id) {
      return new Response(JSON.stringify({ error: 'owner_id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch owner record (verify caller owns it)
    const { data: owner, error: fetchError } = await adminClient
      .from('owners')
      .select('id, auth_user_id, concierge_user_id')
      .eq('id', owner_id)
      .single();

    if (fetchError || !owner) {
      return new Response(JSON.stringify({ error: 'Propriétaire introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (owner.concierge_user_id !== caller.id) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete related data: owner_properties, owner_documents, owner_interventions
    await adminClient.from('owner_properties').delete().eq('owner_id', owner_id);
    await adminClient.from('owner_documents').delete().eq('owner_id', owner_id);
    await adminClient.from('owner_interventions').delete().eq('owner_id', owner_id);

    // Delete owner record
    const { error: deleteError } = await adminClient.from('owners').delete().eq('id', owner_id);
    if (deleteError) {
      console.error('Error deleting owner record:', deleteError);
      throw deleteError;
    }

    // Delete the auth user (email, password, everything)
    if (owner.auth_user_id) {
      // Also delete from public.users table
      await adminClient.from('users').delete().eq('id', owner.auth_user_id);
      await adminClient.from('user_roles').delete().eq('user_id', owner.auth_user_id);

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(owner.auth_user_id);
      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // Non-blocking: owner record already deleted
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('delete-owner error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

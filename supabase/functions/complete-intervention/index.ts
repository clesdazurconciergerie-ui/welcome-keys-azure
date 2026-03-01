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

    const { intervention_id, provider_comment } = await req.json();
    if (!intervention_id) {
      return new Response(JSON.stringify({ error: 'ID intervention manquant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check intervention exists and caller is the assigned SP
    const { data: intervention, error: intError } = await adminClient
      .from('cleaning_interventions')
      .select('id, property_id, concierge_user_id, service_provider_id, status')
      .eq('id', intervention_id)
      .single();

    if (intError || !intervention) {
      return new Response(JSON.stringify({ error: 'Intervention non trouvée' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is the SP
    const { data: sp } = await adminClient
      .from('service_providers')
      .select('id')
      .eq('auth_user_id', caller.id)
      .eq('id', intervention.service_provider_id)
      .single();

    if (!sp) {
      return new Response(JSON.stringify({ error: 'Non autorisé pour cette intervention' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check photos exist
    const { count } = await adminClient
      .from('cleaning_photos')
      .select('id', { count: 'exact', head: true })
      .eq('intervention_id', intervention_id);

    if (!count || count < 4) {
      return new Response(JSON.stringify({ error: 'Minimum 4 photos requises avant de pouvoir valider' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build update payload
    const updatePayload: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      actual_end_time: new Date().toISOString(),
      checklist_validated: true,
    };
    if (provider_comment) updatePayload.provider_comment = provider_comment;

    // Calculate punctuality score
    const { data: fullIntervention } = await adminClient
      .from('cleaning_interventions')
      .select('scheduled_start_time, actual_start_time')
      .eq('id', intervention_id)
      .single();

    if (fullIntervention?.scheduled_start_time && fullIntervention?.actual_start_time) {
      const scheduled = new Date(fullIntervention.scheduled_start_time).getTime();
      const actual = new Date(fullIntervention.actual_start_time).getTime();
      const diffMinutes = (actual - scheduled) / 60000;
      updatePayload.punctuality_score = diffMinutes <= 10 ? 5 : 0;
    }

    // Update intervention status
    const { error: updateError } = await adminClient
      .from('cleaning_interventions')
      .update(updatePayload)
      .eq('id', intervention_id);

    if (updateError) throw updateError;

    // Get property info for notification
    const { data: property } = await adminClient
      .from('properties')
      .select('name, id')
      .eq('id', intervention.property_id)
      .single();

    // Get owner linked to this property (if any)
    const { data: ownerLinks } = await adminClient
      .from('owner_properties')
      .select('owner_id, owners:owner_id(id, email, first_name, auth_user_id)')
      .eq('property_id', intervention.property_id);

    // Get concierge email
    const { data: concierge } = await adminClient
      .from('users')
      .select('email')
      .eq('id', intervention.concierge_user_id)
      .single();

    // Log notification info (email sending would go here with Resend/etc.)
    console.log('Intervention completed:', {
      intervention_id,
      property_name: property?.name,
      concierge_email: concierge?.email,
      owners: ownerLinks?.map((l: any) => l.owners?.email),
      photos_count: count,
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Intervention terminée avec succès',
      notifications: {
        concierge: concierge?.email || null,
        owners: ownerLinks?.map((l: any) => l.owners?.email).filter(Boolean) || [],
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('complete-intervention error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Cleanup Expired Trials] Starting cleanup at', new Date().toISOString());

    // =========================================================================
    // FIND FREE_TRIAL USERS WHOSE GRACE PERIOD HAS ENDED (J+60)
    // Conditions:
    // - role = 'free_trial' (never paid)
    // - subscription_status != 'active' (no payment received)
    // - grace_period_ends_at < now() (grace period expired)
    // =========================================================================
    const { data: usersToCleanup, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, grace_period_ends_at, subscription_status')
      .eq('role', 'free_trial')
      .neq('subscription_status', 'active')
      .lt('grace_period_ends_at', new Date().toISOString());

    if (usersError) {
      console.error('[Cleanup Expired Trials] Error fetching users to cleanup:', usersError);
      throw usersError;
    }

    console.log(`[Cleanup Expired Trials] Found ${usersToCleanup?.length || 0} users with expired grace period`);

    let totalBookletsDeleted = 0;
    let totalRelatedDataDeleted = 0;

    if (usersToCleanup && usersToCleanup.length > 0) {
      for (const user of usersToCleanup) {
        console.log(`[Cleanup Expired Trials] Processing user ${user.email} (${user.id})`);

        // Get all booklets for this user
        const { data: userBooklets, error: bookletsFetchError } = await supabase
          .from('booklets')
          .select('id')
          .eq('user_id', user.id);

        if (bookletsFetchError) {
          console.error(`[Cleanup Expired Trials] Error fetching booklets for user ${user.email}:`, bookletsFetchError);
          continue;
        }

        if (userBooklets && userBooklets.length > 0) {
          const bookletIds = userBooklets.map(b => b.id);

          // Delete related data in order (foreign key dependencies)
          const relatedTables = [
            'wifi_credentials',
            'booklet_contacts',
            'pins',
            'faq',
            'equipment',
            'essentials',
            'restaurants',
            'activities',
            'transport',
            'highlights',
            'nearby_places'
          ];

          for (const table of relatedTables) {
            const { error: deleteRelatedError, count } = await supabase
              .from(table)
              .delete()
              .in('booklet_id', bookletIds);

            if (deleteRelatedError) {
              console.error(`[Cleanup Expired Trials] Error deleting from ${table}:`, deleteRelatedError);
            } else {
              totalRelatedDataDeleted += count || 0;
            }
          }

          // Delete booklets
          const { error: deleteBookletsError } = await supabase
            .from('booklets')
            .delete()
            .in('id', bookletIds);

          if (deleteBookletsError) {
            console.error(`[Cleanup Expired Trials] Error deleting booklets for user ${user.email}:`, deleteBookletsError);
          } else {
            totalBookletsDeleted += userBooklets.length;
            console.log(`[Cleanup Expired Trials] Deleted ${userBooklets.length} booklets for user ${user.email}`);
          }
        }

        // Update user: reset grace_period_ends_at and mark as fully expired
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            subscription_status: 'data_deleted',
            grace_period_ends_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateUserError) {
          console.error(`[Cleanup Expired Trials] Error updating user ${user.email}:`, updateUserError);
        } else {
          console.log(`[Cleanup Expired Trials] User ${user.email} data cleanup completed`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        users_cleaned_up: usersToCleanup?.length || 0,
        booklets_deleted: totalBookletsDeleted,
        related_data_deleted: totalRelatedDataDeleted,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Cleanup Expired Trials] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

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

    console.log('[Expire Trials] Starting trial expiration check at', new Date().toISOString());

    // =========================================================================
    // 1. HANDLE FREE_TRIAL USERS WHOSE 30-DAY TRIAL HAS EXPIRED
    // =========================================================================
    const { data: expiredTrialUsers, error: trialUsersError } = await supabase
      .from('users')
      .select('id, email, role, trial_expires_at, grace_period_ends_at, subscription_status')
      .eq('role', 'free_trial')
      .lt('trial_expires_at', new Date().toISOString())
      .is('grace_period_ends_at', null); // Only users not yet in grace period

    if (trialUsersError) {
      console.error('[Expire Trials] Error fetching expired trial users:', trialUsersError);
      throw trialUsersError;
    }

    console.log(`[Expire Trials] Found ${expiredTrialUsers?.length || 0} free_trial users whose trial just expired`);

    if (expiredTrialUsers && expiredTrialUsers.length > 0) {
      // Set grace period (30 more days) and update subscription status
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

      const { error: updateTrialUsersError } = await supabase
        .from('users')
        .update({
          subscription_status: 'expired',
          grace_period_ends_at: gracePeriodEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', expiredTrialUsers.map(u => u.id));

      if (updateTrialUsersError) {
        console.error('[Expire Trials] Error updating trial users:', updateTrialUsersError);
        throw updateTrialUsersError;
      }

      // Disable their booklets (set status to 'disabled')
      for (const user of expiredTrialUsers) {
        const { error: disableBookletsError } = await supabase
          .from('booklets')
          .update({ status: 'disabled' })
          .eq('user_id', user.id)
          .neq('status', 'disabled');

        if (disableBookletsError) {
          console.error(`[Expire Trials] Error disabling booklets for user ${user.email}:`, disableBookletsError);
        } else {
          console.log(`[Expire Trials] Disabled booklets for user ${user.email} (trial expired, grace period started)`);
        }
      }

      expiredTrialUsers.forEach(user => {
        console.log(`[Expire Trials] Grace period started for user ${user.email} (${user.id}), ends at ${gracePeriodEnd.toISOString()}`);
      });
    }

    // =========================================================================
    // 2. HANDLE DEMO_USER USERS (keeping existing logic for 7-day demo)
    // =========================================================================
    const { data: expiredDemoUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, demo_token_expires_at')
      .eq('role', 'demo_user')
      .lt('demo_token_expires_at', new Date().toISOString());

    if (usersError) {
      console.error('[Expire Trials] Error fetching expired demo users:', usersError);
      throw usersError;
    }

    console.log(`[Expire Trials] Found ${expiredDemoUsers?.length || 0} expired demo users`);

    if (expiredDemoUsers && expiredDemoUsers.length > 0) {
      // Update expired demo users
      const { error: updateUsersError } = await supabase
        .from('users')
        .update({
          role: 'free',
          subscription_status: 'expired',
          updated_at: new Date().toISOString()
        })
        .in('id', expiredDemoUsers.map(u => u.id));

      if (updateUsersError) {
        console.error('[Expire Trials] Error updating demo users:', updateUsersError);
        throw updateUsersError;
      }

      // Archive their demo booklets
      const { data: expiredBooklets, error: bookletsFindError } = await supabase
        .from('booklets')
        .select('id, property_name')
        .in('user_id', expiredDemoUsers.map(u => u.id))
        .eq('is_demo', true)
        .eq('status', 'published');

      if (bookletsFindError) {
        console.error('[Expire Trials] Error finding demo booklets:', bookletsFindError);
        throw bookletsFindError;
      }

      if (expiredBooklets && expiredBooklets.length > 0) {
        const { error: updateBookletsError } = await supabase
          .from('booklets')
          .update({ status: 'archived' })
          .in('id', expiredBooklets.map(b => b.id));

        if (updateBookletsError) {
          console.error('[Expire Trials] Error archiving demo booklets:', updateBookletsError);
          throw updateBookletsError;
        }

        console.log(`[Expire Trials] Archived ${expiredBooklets.length} demo booklets`);
      }

      expiredDemoUsers.forEach(user => {
        console.log(`[Expire Trials] Expired demo for user ${user.email} (${user.id})`);
      });
    }

    const totalExpired = (expiredDemoUsers?.length || 0) + (expiredTrialUsers?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        trial_users_entered_grace_period: expiredTrialUsers?.length || 0,
        expired_demos: expiredDemoUsers?.length || 0,
        total_processed: totalExpired,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Expire Trials] Fatal error:', error);
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

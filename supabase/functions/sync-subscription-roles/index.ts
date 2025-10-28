import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sync Subscription Roles - Fallback Cron Job
 * 
 * This function runs periodically (e.g., daily) to ensure consistency
 * between Stripe subscription status and user roles in the database.
 * 
 * It handles cases where webhooks might have failed or been missed.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });

    console.log('[Sync Roles] Starting role synchronization at', new Date().toISOString());

    // Find all users with Stripe customer IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, stripe_customer_id, role, subscription_status')
      .not('stripe_customer_id', 'is', null);

    if (usersError) {
      console.error('[Sync Roles] Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`[Sync Roles] Found ${users?.length || 0} users with Stripe customers`);

    let syncedCount = 0;
    let downgradeCount = 0;
    let errorCount = 0;

    for (const user of users || []) {
      try {
        // Get active subscriptions from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          limit: 10,
        });

        const activeSubscription = subscriptions.data.find(
          (sub: Stripe.Subscription) => sub.status === 'active' || sub.status === 'trialing'
        );

        if (activeSubscription) {
          // User has active subscription - ensure role matches
          const product = activeSubscription.items.data[0]?.price.product;
          let expectedRole = 'pack_starter'; // default

          if (typeof product === 'object' && product.metadata?.role) {
            expectedRole = product.metadata.role;
          }

          const expectedStatus = activeSubscription.status === 'trialing' ? 'trial_active' : 'active';

          // Check if update needed
          if (user.role !== expectedRole || user.subscription_status !== expectedStatus) {
            console.log(`[Sync Roles] Updating user ${user.email}: ${user.role} → ${expectedRole}`);

            await supabase
              .from('users')
              .update({
                role: expectedRole,
                subscription_status: expectedStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);

            // Ensure role in user_roles table
            await supabase
              .from('user_roles')
              .upsert(
                {
                  user_id: user.id,
                  role: expectedRole,
                  assigned_at: new Date().toISOString(),
                },
                {
                  onConflict: 'user_id,role',
                  ignoreDuplicates: false,
                }
              );

            syncedCount++;
          }
        } else {
          // No active subscription - check if user should be downgraded
          const paidRoles = ['pack_starter', 'pack_pro', 'pack_business', 'pack_premium'];
          
          if (paidRoles.includes(user.role)) {
            console.log(`[Sync Roles] Downgrading user ${user.email}: no active subscription`);

            await supabase
              .from('users')
              .update({
                role: 'free',
                subscription_status: 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);

            // Remove paid roles
            await supabase
              .from('user_roles')
              .delete()
              .eq('user_id', user.id)
              .in('role', paidRoles);

            downgradeCount++;
          }
        }
      } catch (error: any) {
        console.error(`[Sync Roles] Error processing user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    // Also handle expired trials and demos
    const now = new Date().toISOString();

    // Expire free trials
    const { data: expiredTrials, error: trialsError } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'free_trial')
      .lt('trial_expires_at', now);

    if (!trialsError && expiredTrials && expiredTrials.length > 0) {
      await supabase
        .from('users')
        .update({
          role: 'free',
          subscription_status: 'expired',
          updated_at: now,
        })
        .eq('role', 'free_trial')
        .lt('trial_expires_at', now);

      console.log(`[Sync Roles] Expired ${expiredTrials.length} free trials`);
    }

    // Expire demos
    const { data: expiredDemos, error: demosError } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'demo_user')
      .lt('demo_token_expires_at', now);

    if (!demosError && expiredDemos && expiredDemos.length > 0) {
      await supabase
        .from('users')
        .update({
          role: 'free',
          subscription_status: 'expired',
          updated_at: now,
        })
        .eq('role', 'demo_user')
        .lt('demo_token_expires_at', now);

      console.log(`[Sync Roles] Expired ${expiredDemos.length} demos`);
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      total_users: users?.length || 0,
      synced: syncedCount,
      downgraded: downgradeCount,
      expired_trials: expiredTrials?.length || 0,
      expired_demos: expiredDemos?.length || 0,
      errors: errorCount,
    };

    console.log('[Sync Roles] Completed:', summary);

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[Sync Roles] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

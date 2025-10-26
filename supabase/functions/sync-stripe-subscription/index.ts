import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    console.log('Syncing subscription for user:', user.email);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Search for customer by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      console.log('No Stripe customer found for:', user.email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Aucun client Stripe trouvé pour cet email' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer = customers.data[0];
    console.log('Found Stripe customer:', customer.id);

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      console.log('No active subscriptions found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Aucun abonnement actif trouvé' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subscription = subscriptions.data[0];
    console.log('Found active subscription:', subscription.id);

    // Determine role from price
    const priceId = subscription.items.data[0]?.price.id;
    let role = 'pack_starter'; // default

    // Map price IDs to roles (you need to configure these)
    const priceToRole: Record<string, string> = {
      'price_starter': 'pack_starter',
      'price_pro': 'pack_pro',
      'price_business': 'pack_business',
      'price_premium': 'pack_premium',
    };

    // Try to match by product name or price ID
    for (const [key, value] of Object.entries(priceToRole)) {
      if (priceId?.includes(key.replace('price_', ''))) {
        role = value;
        break;
      }
    }

    console.log('Determined role:', role);

    // Update users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        stripe_customer_id: customer.id,
        subscription_status: 'active',
        role: role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (userError) {
      console.error('Error updating user:', userError);
      throw userError;
    }

    // Upsert role to user_roles
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: user.id,
          role: role,
          assigned_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,role',
          ignoreDuplicates: false,
        }
      );

    if (roleError) {
      console.error('Error upserting role:', roleError);
    }

    // Create/update subscription record
    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: user.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customer.id,
          status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'stripe_subscription_id',
        }
      );

    if (subError) {
      console.error('Error upserting subscription:', subError);
    }

    console.log('✅ Sync completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        role: role,
        customer_id: customer.id,
        subscription_id: subscription.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    const error = err as Error;
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

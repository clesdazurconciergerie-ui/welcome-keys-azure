import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Payment link mapping to roles
const paymentLinkToRole: Record<string, string> = {
  'cNi5kDeMB6Cd8htgEQ5kk00': 'pack_starter',
  '7sYfZh9sh4u57dpgEQ5kk01': 'pack_pro',
  '14A4gzbAp6CdcxJcoA5kk02': 'pack_business',
  'bJe5kD5c1aStdBN2O05kk03': 'pack_premium',
};

// Success URL to role mapping (fallback)
const successUrlToRole: Record<string, string> = {
  'starter': 'pack_starter',
  'pro': 'pack_pro',
  'business': 'pack_business',
  'premium': 'pack_premium',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No stripe signature found');
      return new Response('No signature', { status: 400, headers: corsHeaders });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('No webhook secret configured');
      return new Response('Webhook secret not configured', { status: 500, headers: corsHeaders });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      return new Response(`Webhook Error: ${error.message}`, { status: 400, headers: corsHeaders });
    }

    console.log('Received Stripe event:', event.type);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = (session.customer as string) ?? null;
      const subscriptionId = (session.subscription as string) ?? null;

      console.log('Processing checkout.session.completed for user:', userId);

      if (!userId) {
        console.warn('No client_reference_id found in session');
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Determine role from payment link or success URL
      let role = 'pack_starter'; // Default
      
      // Extract from payment link URL
      if (session.payment_link) {
        const paymentLinkUrl = typeof session.payment_link === 'string' 
          ? session.payment_link 
          : (session.payment_link.url || session.payment_link.id);
        
        console.log('Payment link URL:', paymentLinkUrl);
        
        // Search for the code in the URL
        for (const [linkCode, roleValue] of Object.entries(paymentLinkToRole)) {
          if (paymentLinkUrl.includes(linkCode)) {
            role = roleValue;
            console.log('✅ Role matched from payment link:', { linkCode, role });
            break;
          }
        }
      }
      
      // Fallback to success URL if no role matched from payment link
      let roleMatchedFromPaymentLink = false;
      if (session.payment_link) {
        const paymentLinkUrl = typeof session.payment_link === 'string' 
          ? session.payment_link 
          : (session.payment_link.url || session.payment_link.id);
        
        for (const [linkCode, roleValue] of Object.entries(paymentLinkToRole)) {
          if (paymentLinkUrl.includes(linkCode)) {
            roleMatchedFromPaymentLink = true;
            break;
          }
        }
      }
      
      if (!roleMatchedFromPaymentLink && session.success_url) {
        for (const [key, value] of Object.entries(successUrlToRole)) {
          if (session.success_url.includes(key)) {
            role = value;
            console.log('✅ Role matched from success URL:', { key, role });
            break;
          }
        }
      }

      console.log('Determined role:', role, 'for user:', userId);

      // Get current user state
      const { data: currentUser } = await supabase
        .from('users')
        .select('role, subscription_status, has_used_demo')
        .eq('id', userId)
        .single();

      console.log('Current user state before update:', currentUser);

      // Update users table - paid role ALWAYS overrides demo status
      const { error: userError } = await supabase
        .from('users')
        .update({
          role: role, // Paid role takes priority
          stripe_customer_id: customerId,
          latest_checkout_session_id: session.id,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
          // demo_active remains unchanged - it's just informational
        })
        .eq('id', userId);

      if (userError) {
        console.error('Error updating user:', userError);
        return new Response(`Database error: ${userError.message}`, { status: 500, headers: corsHeaders });
      }

      console.log('✅ User upgraded:', {
        userId,
        previousRole: currentUser?.role,
        newRole: role,
        hasUsedDemo: currentUser?.has_used_demo,
        subscriptionStatus: 'active'
      });

      // Upsert role to user_roles table (security-critical)
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(
          {
            user_id: userId,
            role: role,
            assigned_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,role',
            ignoreDuplicates: false,
          }
        );

      if (roleError) {
        console.error('Error upserting role to user_roles:', roleError);
      }

      // Create or update subscription record
      if (subscriptionId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: 'active',
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: stripeSubscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'stripe_subscription_id',
            }
          );

        if (subError) {
          console.error('Error upserting subscription:', subError);
        }
      }

      console.log('User and subscription updated successfully for user:', userId);
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find user by Stripe customer ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (userData) {
        const userId = userData.id;

        if (event.type === 'customer.subscription.deleted' || subscription.status === 'canceled') {
          console.log('Handling subscription cancellation for user:', userId);

          // Update user status
          await supabase
            .from('users')
            .update({
              subscription_status: 'expired',
              role: 'free',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          // Remove all paid roles from user_roles
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)
            .in('role', ['pack_starter', 'pack_pro', 'pack_business', 'pack_premium']);

          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          console.log('Subscription canceled for user:', userId);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const error = err as Error;
    console.error('Unexpected error:', error);
    return new Response(`Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      return new Response(`Webhook Error: ${error.message}`, { status: 400, headers: corsHeaders });
    }

    console.log('Received Stripe event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const email = session.customer_details?.email ?? session.customer_email ?? null;
      const customerId = (session.customer as string) ?? null;

      console.log('Processing checkout.session.completed for user:', userId);

      if (userId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data, error } = await supabase
          .from('users')
          .update({
            role: 'pack_starter',
            stripe_customer_id: customerId,
            latest_checkout_session_id: session.id,
            subscription_status: 'active',
          })
          .eq('id', userId)
          .select();

        if (error) {
          console.error('Error updating user:', error);
          return new Response(`Database error: ${error.message}`, { status: 500, headers: corsHeaders });
        }

        console.log('User updated successfully:', data);
      } else {
        console.warn('No client_reference_id found in session');
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

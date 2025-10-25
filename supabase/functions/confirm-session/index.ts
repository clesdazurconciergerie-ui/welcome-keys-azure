import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer l'utilisateur à partir du JWT
    const { data: userInfo, error: userErr } = await supabase.auth.getUser(token);
    
    if (userErr || !userInfo.user) {
      console.error('Auth error:', userErr);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uid = userInfo.user.id;
    const email = userInfo.user.email ?? '';

    // Récupérer session_id
    const { session_id } = req.method === 'POST' 
      ? await req.json() 
      : Object.fromEntries(new URL(req.url).searchParams);

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying Stripe session:', session_id, 'for user:', uid);

    // Vérifier la session Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    console.log('Stripe session retrieved:', {
      payment_status: session.payment_status,
      client_reference_id: session.client_reference_id,
      customer_email: session.customer_details?.email || session.customer_email
    });

    // Vérifier que le paiement est confirmé
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed', payment_status: session.payment_status }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sécurité : vérifier que l'utilisateur correspond au payeur
    const matchesUid = session.client_reference_id === uid;
    const sessionEmail = (session.customer_details?.email || session.customer_email || '').toLowerCase();
    const userEmail = (email || '').toLowerCase();
    const matchesEmail = sessionEmail === userEmail;

    if (!matchesUid && !matchesEmail) {
      console.error('User mismatch:', { uid, sessionEmail, userEmail, client_ref: session.client_reference_id });
      return new Response(
        JSON.stringify({ error: 'User mismatch: session does not belong to this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mettre à jour l'utilisateur
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({
        role: 'pack_starter',
        subscription_status: 'active',
        stripe_customer_id: (session.customer as string) || null,
        latest_checkout_session_id: session.id,
      })
      .eq('id', uid)
      .select();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User updated successfully:', updateData);

    return new Response(
      JSON.stringify({ ok: true, role: 'pack_starter', subscription_status: 'active' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

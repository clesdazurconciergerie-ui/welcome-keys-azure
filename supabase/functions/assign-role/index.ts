import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { user_id, role, assigned_by } = await req.json();

    // Validate inputs
    if (!user_id || !role) {
      console.error('Missing required fields:', { user_id, role });
      return new Response(
        JSON.stringify({ error: 'user_id and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid roles
    const validRoles = [
      'free_trial',
      'demo_user',
      'free',
      'pack_starter',
      'pack_pro',
      'pack_business',
      'pack_premium',
      'super_admin'
    ];

    if (!validRoles.includes(role)) {
      console.error('Invalid role:', role);
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Assigning role:', { user_id, role, assigned_by });

    // Insert role (ON CONFLICT DO NOTHING via upsert)
    const { data, error } = await supabase
      .from('user_roles')
      .upsert(
        { 
          user_id, 
          role, 
          assigned_by,
          assigned_at: new Date().toISOString()
        },
        { 
          onConflict: 'user_id,role',
          ignoreDuplicates: true 
        }
      )
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to assign role', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Role assigned successfully:', data);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: 'Role assigned successfully',
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { booklet_id } = await req.json();
    if (!booklet_id) {
      return new Response(JSON.stringify({ error: 'booklet_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get visitor IP from headers
    const forwarded = req.headers.get('x-forwarded-for');
    const visitorIp = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    console.log('[track-view] booklet_id:', booklet_id, 'ip:', visitorIp);

    // Try to insert — unique constraint will prevent duplicates
    const { error: insertError } = await supabase
      .from('booklet_views')
      .insert({ booklet_id, visitor_ip: visitorIp });

    if (insertError) {
      // 23505 = unique_violation — same IP already counted
      if (insertError.code === '23505') {
        console.log('[track-view] Already counted for this IP');
        return new Response(JSON.stringify({ tracked: false, reason: 'already_counted' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.error('[track-view] Insert error:', insertError);
      throw insertError;
    }

    // New unique visitor — update the counter
    const { data: countData } = await supabase
      .from('booklet_views')
      .select('id', { count: 'exact', head: true })
      .eq('booklet_id', booklet_id);

    const uniqueCount = countData ?? 0;

    // Use a direct count query for accuracy
    const { count } = await supabase
      .from('booklet_views')
      .select('*', { count: 'exact', head: true })
      .eq('booklet_id', booklet_id);

    await supabase
      .from('booklets')
      .update({ unique_views_count: count || 1 })
      .eq('id', booklet_id);

    console.log('[track-view] New unique view recorded, total:', count);

    return new Response(JSON.stringify({ tracked: true, unique_views: count }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[track-view] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

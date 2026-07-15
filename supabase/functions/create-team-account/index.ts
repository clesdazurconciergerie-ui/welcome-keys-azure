import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'team_member' | 'service_provider' | 'owner';
  sections?: Record<string, { r?: boolean; c?: boolean; u?: boolean; d?: boolean }>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Non autorisé' }, 401);

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user: caller }, error: authErr } = await anon.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !caller) return json({ error: 'Non autorisé' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check caller is super_admin
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', caller.id);
    const isSuper = (roles || []).some((r: any) => r.role === 'super_admin');
    if (!isSuper) return json({ error: 'Réservé au super-administrateur' }, 403);

    const body = await req.json() as Body;
    if (!body.email || !body.password || !body.first_name || !body.last_name || !body.role) {
      return json({ error: 'Champs manquants' }, 400);
    }
    if (body.password.length < 6) return json({ error: 'Mot de passe: 6 caractères min' }, 400);

    // Create auth user with created_by_admin flag (bypasses signup block)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: `${body.first_name} ${body.last_name}`,
        role: body.role,
        created_by_admin: true,
        created_by: caller.id,
      },
    });
    if (createErr) {
      const msg = createErr.message?.includes('already') ? 'Cet email existe déjà' : createErr.message;
      return json({ error: msg }, 409);
    }

    const newUserId = created.user!.id;

    // Assign role
    await admin.from('user_roles').upsert({ user_id: newUserId, role: body.role }, { onConflict: 'user_id,role' });

    // Store permissions (only meaningful for team_member, but stored for all)
    if (body.sections && Object.keys(body.sections).length > 0) {
      await admin.from('team_permissions').upsert({
        user_id: newUserId,
        sections: body.sections,
        created_by: caller.id,
      }, { onConflict: 'user_id' });
    }

    return json({ success: true, user_id: newUserId });
  } catch (e) {
    console.error('create-team-account error:', e);
    return json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

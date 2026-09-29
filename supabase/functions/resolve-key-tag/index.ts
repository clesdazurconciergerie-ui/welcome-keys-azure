import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pathToken = url.pathname.split("/").filter(Boolean).pop()?.trim();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const token = (pathToken === "resolve-key-tag" ? body?.token : pathToken)?.trim();
    if (!token || !/^[a-f0-9]{48}$/i.test(token)) return json({ error: "Puce NFC invalide" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: keySet, error } = await supabase
      .from("key_sets")
      .select(`
        id, user_id, code, name, pouch_role, expected_items, status,
        current_holder_type, current_holder_label, due_back_at, booklet_id,
        property:properties(id, name, address, city, postcode, country),
        booklet:booklets(id, google_maps_link, status)
      `)
      .eq("public_token", token)
      .maybeSingle();

    if (error || !keySet) return json({ error: "Pochette introuvable" }, 404);

    let authenticatedUser: { id: string } | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const bearer = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(bearer);
      authenticatedUser = data.user ? { id: data.user.id } : null;
    }

    let staffMode = authenticatedUser?.id === keySet.user_id;
    if (authenticatedUser && !staffMode) {
      const { data: provider } = await supabase
        .from("service_providers")
        .select("id")
        .eq("provider_user_id", authenticatedUser.id)
        .eq("concierge_user_id", keySet.user_id)
        .eq("status", "active")
        .maybeSingle();
      staffMode = Boolean(provider);
    }

    if (staffMode) {
      return json({
        mode: "staff",
        keySet: {
          id: keySet.id,
          code: keySet.code,
          name: keySet.name,
          role: keySet.pouch_role,
          expectedItems: keySet.expected_items,
          status: keySet.status,
          holderType: keySet.current_holder_type,
          holderLabel: keySet.current_holder_label,
          dueBackAt: keySet.due_back_at,
        },
        property: keySet.property,
        mapsUrl: keySet.booklet?.google_maps_link ?? null,
      });
    }

    if (!keySet.booklet_id || keySet.booklet?.status !== "published") {
      return json({ mode: "guest", unavailable: true });
    }

    const { data: pin } = await supabase
      .from("pins")
      .select("pin_code")
      .eq("booklet_id", keySet.booklet_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({
      mode: "guest",
      bookletCode: pin?.pin_code ?? null,
      unavailable: !pin?.pin_code,
    });
  } catch (error) {
    console.error("resolve-key-tag", error);
    return json({ error: "Impossible de lire cette puce pour le moment" }, 500);
  }
});

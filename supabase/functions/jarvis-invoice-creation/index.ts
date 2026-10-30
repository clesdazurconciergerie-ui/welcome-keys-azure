import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import {
  validateCreateRequest,
  validateDraftReferenceRequest,
  validatePrepareRequest,
  validateResultRequest,
  validateVersionRequest,
  type InvoiceCreationAction,
} from "./invoice-contract.ts";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hasJarvisToken(req: Request, expectedHash: string) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice(7);
  if (token.length < 32 || token.length > 512) return false;
  return constantTimeEqual(await sha256(token), expectedHash);
}

function rpcError(error: { message?: string; code?: string } | null) {
  if (!error) return null;
  const safeCode = error.message?.match(/invoice_[a-z_]+/)?.[0] ?? "invoice_operation_failed";
  return json(error.code === "P0001" ? 409 : 500, { error: safeCode });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const action = body.action as InvoiceCreationAction | "context";
  if (!["context", "prepare", "get", "approve", "create", "result"].includes(action)) {
    return json(400, { error: "invalid_action" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const ownerUserId = Deno.env.get("JARVIS_INVOICE_OWNER_USER_ID") ?? "";
  const tokenHash = (Deno.env.get("JARVIS_INVOICE_WRITE_TOKEN_SHA256") ?? "").toLowerCase();
  if (!supabaseUrl || !serviceRole || !anonKey || !ownerUserId || !/^[0-9a-f]{64}$/.test(tokenHash)) {
    return json(503, { error: "service_not_configured" });
  }

  const service = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authorization = req.headers.get("authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const jarvisAuthorized = await hasJarvisToken(req, tokenHash);
  const { data: authData, error: authError } = jarvisAuthorized
    ? { data: { user: null }, error: null }
    : await userClient.auth.getUser();
  const ownerSession = !authError && authData.user?.id === ownerUserId;

  // Approval is deliberately different from Jarvis authentication: it requires
  // Noa's live MyWelcome user session and approves one exact revision/fingerprint.
  if (action === "approve") {
    if (!validateVersionRequest(body)) return json(400, { error: "invalid_parameters" });
    if (!ownerSession) return json(401, { error: "approval_requires_owner_session" });
    const { data, error } = await userClient.rpc("approve_invoice_creation_draft", {
      p_draft_id: body.draft_id,
      p_version: body.version,
      p_fingerprint: body.fingerprint,
    });
    return rpcError(error) ?? json(200, { state: "approved", approval: data });
  }

  if (action === "get") {
    if (!ownerSession) return json(401, { error: "approval_requires_owner_session" });
    if (!validateDraftReferenceRequest(body)) return json(400, { error: "invalid_parameters" });
    const { data, error } = await userClient.rpc("get_invoice_creation_draft_for_approval", {
      p_draft_id: body.draft_id,
    });
    if (error) return rpcError(error)!;
    if (!data) return json(404, { error:"invoice_draft_not_found" });
    const recipient = await service.from("owners").select("first_name,last_name").eq("id",data.input.owner_id).eq("concierge_user_id",ownerUserId).single();
    if (recipient.error) return json(409, { error:"invoice_owner_missing" });
    return json(200, { state: data.status ?? "draft", draft: { ...data,
      recipient_name:[recipient.data.first_name,recipient.data.last_name].filter(Boolean).join(" "),
    }});
  }

  // Jarvis uses its dedicated token. MyWelcome may use Noa's current session;
  // the owner id remains server-configured and is never accepted from the body.
  if (!jarvisAuthorized && !ownerSession) return json(401, { error: "unauthorized" });

  if (action === "context") {
    const [owners, properties, settings] = await Promise.all([
      service.from("owners").select("id,first_name,last_name,auth_user_id").eq("concierge_user_id", ownerUserId).limit(1001),
      service.from("properties").select("id,name").eq("user_id", ownerUserId).limit(1001),
      service.from("financial_settings").select("vat_enabled,invoice_rounding_policy").eq("user_id", ownerUserId).single(),
    ]);
    if (owners.error || properties.error || settings.error || !settings.data ||
        (owners.data?.length ?? 0)>1000 || (properties.data?.length ?? 0)>1000) {
      return json(503, { error: "invoice_context_unavailable" });
    }
    const ownerIds = new Set((owners.data ?? []).map((x) => x.id));
    const propertyIds = new Set((properties.data ?? []).map((x) => x.id));
    const links = ownerIds.size && propertyIds.size ? await service.from("owner_properties").select("owner_id,property_id").in("owner_id", [...ownerIds]).in("property_id", [...propertyIds]).limit(10001) : { data:[], error:null };
    if (links.error || (links.data?.length ?? 0)>10000) return json(503, { error:"invoice_context_unavailable" });
    return json(200, { state: "ok", context: {
      owners: (owners.data ?? []).map((x) => ({ id:x.id, name:[x.first_name,x.last_name].filter(Boolean).join(" "), portal_linked:!!x.auth_user_id })),
      properties: properties.data,
      owner_properties: (links.data ?? []).filter((x) => ownerIds.has(x.owner_id) && propertyIds.has(x.property_id)),
      vat_enabled: settings.data.vat_enabled,
      rounding_policy: settings.data.invoice_rounding_policy,
    }});
  }

  if (action === "prepare") {
    if (!validatePrepareRequest(body)) return json(400, { error: "invalid_parameters" });
    const { data, error } = await service.rpc("prepare_invoice_creation_draft", {
      p_user_id: ownerUserId,
      p_draft_id: body.draft_id ?? null,
      p_expected_version: body.expected_version ?? null,
      p_input: body.draft,
    });
    return rpcError(error) ?? json(200, { state: "draft", draft: data });
  }

  if (action === "create") {
    if (!validateCreateRequest(body)) return json(400, { error: "invalid_parameters" });
    const { data, error } = await service.rpc("create_invoice_from_approved_draft", {
      p_user_id: ownerUserId,
      p_draft_id: body.draft_id,
      p_version: body.version,
      p_fingerprint: body.fingerprint,
      p_idempotency_key: body.idempotency_key,
    });
    return rpcError(error) ?? json(200, { state: "created", result: data });
  }

  if (!validateResultRequest(body)) return json(400, { error: "invalid_parameters" });
  const { data, error } = await service.rpc("get_invoice_creation_result", {
    p_user_id: ownerUserId,
    p_idempotency_key: body.idempotency_key,
  });
  if (error) return rpcError(error)!;
  if (!data) return json(200, { state:"not_found" });
  const invoice = await service.from("invoices").select("owner_published_at").eq("id",data.invoice_id).eq("user_id",ownerUserId).maybeSingle();
  return json(200, { state:"created", result:data, delivery:invoice.error || !invoice.data ? {state:"unknown"} : {
    state:invoice.data.owner_published_at ? "published" : "not_published", published_at:invoice.data.owner_published_at,
  }});
});

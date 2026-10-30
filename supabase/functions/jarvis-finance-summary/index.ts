import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import {
  consolidateExpenses,
  emptyPayload,
  invoiceIdsWithOutsideScopeItems,
  latestUpdatedAt,
  mapBookings,
  mapCalendarEvents,
  mapCashIncomes,
  mapInvoiceItems,
  mapInvoices,
  mapProperties,
  MAX_ROWS,
  PARIS_TIMEZONE,
  shiftDay,
  validatePeriod,
  type FinanceWarning,
} from "./finance-contract.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
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

async function authorized(req: Request, expectedHash: string) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return false;
  const token = authorization.slice(7);
  if (token.length < 32 || token.length > 512) return false;
  return constantTimeEqual(await sha256(token), expectedHash.toLowerCase());
}

type QueryResult = { data: Record<string, unknown>[] | null; error: unknown };

function bounded(result: QueryResult, warning: FinanceWarning, warnings: FinanceWarning[]) {
  if (result.error || !result.data || result.data.length > MAX_ROWS) {
    warnings.push(warning);
    return [];
  }
  return result.data;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return json(405, { error: "method_not_allowed" });

  const tokenHash = (Deno.env.get("JARVIS_FINANCE_READ_TOKEN_SHA256") ?? "").toLowerCase();
  const ownerUserId = Deno.env.get("JARVIS_FINANCE_OWNER_USER_ID") ?? "";
  if (!/^[0-9a-f]{64}$/.test(tokenHash) || !UUID.test(ownerUserId)) {
    return json(503, { error: "service_not_configured" });
  }
  if (!(await authorized(req, tokenHash))) return json(401, { error: "unauthorized" });

  const url = new URL(req.url);
  const periodStart = url.searchParams.get("period_start") ?? "";
  const periodEnd = url.searchParams.get("period_end_exclusive") ?? "";
  const timezone = url.searchParams.get("timezone") ?? "";
  if (!validatePeriod(periodStart, periodEnd, timezone)) {
    return json(400, { error: "invalid_parameters" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRole) return json(503, { error: "service_not_configured" });
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const propertiesResult = await supabase
    .from("properties")
    .select("id,name,status,created_at,updated_at")
    .eq("user_id", ownerUserId)
    .eq("status", "active")
    .limit(MAX_ROWS + 1);
  const propertyWarnings: FinanceWarning[] = [];
  const propertyRows = bounded(propertiesResult, "source_properties_failed", propertyWarnings);
  if (propertyWarnings.length) return json(200, emptyPayload("error", propertyWarnings));

  // Occupancy includes retired properties when a verified historical period overlaps.
  // Keep propertyIds below unchanged for all finance/invoice queries.
  const allPropertiesResult = await supabase.from("properties")
    .select("id,name,status,updated_at")
    .eq("user_id", ownerUserId).limit(MAX_ROWS + 1);
  const occupancyWarnings: FinanceWarning[] = [];
  const allProperties = bounded(allPropertiesResult, "source_property_listing_periods_failed", occupancyWarnings);
  const allPropertyIds = allProperties.map((row) => String(row.id));
  const [periodsResult, attestationResult] = allPropertyIds.length && !occupancyWarnings.length
    ? await Promise.all([
        supabase.from("property_listing_periods")
          .select("property_id,online_from,online_until_exclusive,updated_at")
          .in("property_id", allPropertyIds)
          .lt("online_from", periodEnd)
          .or(`online_until_exclusive.is.null,online_until_exclusive.gt.${periodStart}`)
          .limit(MAX_ROWS + 1),
        supabase.from("property_listing_history_attestations")
          .select("complete_from,attested_at")
          .eq("owner_user_id", ownerUserId).maybeSingle(),
      ])
    : [{data: null, error: "unavailable"}, {data: null, error: "unavailable"}];
  const periods = bounded(periodsResult as QueryResult, "source_property_listing_periods_failed", occupancyWarnings);
  if (attestationResult.error) occupancyWarnings.push("source_property_listing_periods_failed");
  const attested = !occupancyWarnings.length && !!attestationResult.data &&
    String(attestationResult.data.complete_from) <= periodStart;
  const occupancyPropertyRows = attested ? allProperties : propertyRows;
  const occupancyIds = occupancyPropertyRows.map((row) => String(row.id));
  const periodMap = new Map<string, {start: string; end_exclusive: string | null}[]>();
  for (const row of periods) {
    const id = String(row.property_id);
    if (!allPropertyIds.includes(id)) { occupancyWarnings.push("source_property_listing_periods_failed"); continue; }
    const list = periodMap.get(id) ?? [];
    list.push({start: String(row.online_from), end_exclusive: row.online_until_exclusive ? String(row.online_until_exclusive) : null});
    periodMap.set(id, list);
  }
  const propertyIds = propertyRows.map((row) => String(row.id));
  const financeIdsForQuery = propertyIds.length ? propertyIds : ["00000000-0000-4000-8000-000000000000"];
  if (!occupancyIds.length) {
    if (occupancyWarnings.length) return json(200, emptyPayload("error", [...new Set(occupancyWarnings)]));
    return json(200, {
      state: "ok",
      properties: [], bookings: [], calendar_events: [], invoices: [], invoice_items: [],
      cash_incomes: [], expenses: [], source_updated_at: null, warnings: [],
    });
  }

  const broadTimestampStart = `${shiftDay(periodStart, -1)}T00:00:00Z`;
  const broadTimestampEnd = `${shiftDay(periodEnd, 1)}T00:00:00Z`;
  const [bookingsResult, eventsResult, cashResult, expensesResult, vendorsResult, missionsResult, ownerLinksResult] = await Promise.all([
    supabase.from("bookings")
      .select("id,property_id,calendar_event_id,check_in,check_out,price_status,created_at,updated_at")
      .eq("user_id", ownerUserId).in("property_id", occupancyIds)
      .lt("check_in", periodEnd).gt("check_out", periodStart).limit(MAX_ROWS + 1),
    supabase.from("calendar_events")
      .select("id,property_id,start_date,end_date,event_type,status,platform,created_at,updated_at")
      .eq("user_id", ownerUserId).in("property_id", occupancyIds)
      .lt("start_date", periodEnd).gt("end_date", periodStart).limit(MAX_ROWS + 1),
    supabase.from("cash_incomes")
      .select("id,property_id,amount,income_date,created_at,updated_at")
      .eq("user_id", ownerUserId).in("property_id", financeIdsForQuery)
      .gte("income_date", periodStart).lt("income_date", periodEnd).limit(MAX_ROWS + 1),
    supabase.from("expenses")
      .select("id,property_id,amount,expense_date,created_at,updated_at")
      .eq("user_id", ownerUserId).in("property_id", financeIdsForQuery)
      .gte("expense_date", periodStart).lt("expense_date", periodEnd).limit(MAX_ROWS + 1),
    supabase.from("vendor_payments")
      .select("id,property_id,amount,date,status,created_at,updated_at")
      .eq("user_id", ownerUserId).in("property_id", financeIdsForQuery)
      .gte("date", periodStart).lt("date", periodEnd).limit(MAX_ROWS + 1),
    supabase.from("missions")
      .select("id,property_id,payout_amount,start_at,status,created_at,updated_at")
      .eq("user_id", ownerUserId).in("property_id", financeIdsForQuery)
      .gte("start_at", broadTimestampStart).lt("start_at", broadTimestampEnd).limit(MAX_ROWS + 1),
    supabase.from("owner_properties")
      .select("owner_id,property_id,created_at").in("property_id", financeIdsForQuery).limit(MAX_ROWS + 1),
  ]);

  const warnings: FinanceWarning[] = [...new Set(occupancyWarnings)];
  const bookings = bounded(bookingsResult, "source_bookings_failed", warnings);
  const calendarEvents = bounded(eventsResult, "source_calendar_events_failed", warnings);
  const cashIncomes = bounded(cashResult, "source_cash_incomes_failed", warnings);
  const expenseRows = bounded(expensesResult, "source_expenses_failed", warnings);
  const vendorRows = bounded(vendorsResult, "source_expenses_failed", warnings);
  const missionRows = bounded(missionsResult, "source_expenses_failed", warnings);
  const ownerLinks = bounded(ownerLinksResult, "source_invoices_failed", warnings);
  const ownerIds = [...new Set(ownerLinks.map((row) => String(row.owner_id)))];

  let invoiceRows: Record<string, unknown>[] = [];
  let invoiceItemRows: Record<string, unknown>[] = [];
  if (ownerIds.length && !warnings.includes("source_invoices_failed")) {
    const invoicesResult = await supabase.from("invoices")
      .select("id,owner_id,type,status,issue_date,paid_at,subtotal,vat_amount,total,vat_enabled:company_snapshot->vat_enabled,created_at,updated_at")
      .eq("user_id", ownerUserId)
      .in("owner_id", ownerIds)
      .or(`and(issue_date.gte.${periodStart},issue_date.lt.${periodEnd}),and(paid_at.gte.${broadTimestampStart},paid_at.lt.${broadTimestampEnd})`)
      .limit(MAX_ROWS + 1);
    invoiceRows = bounded(invoicesResult, "source_invoices_failed", warnings);
    const invoices = mapInvoices(invoiceRows, periodStart, periodEnd);
    const invoiceIds = invoices.map((row) => String(row.id));
    if (invoiceIds.length && !warnings.includes("source_invoices_failed")) {
      const itemsResult = await supabase.from("invoice_items")
        .select("id,invoice_id,property_id,total,line_type,created_at,updated_at")
        .in("invoice_id", invoiceIds).limit(MAX_ROWS + 1);
      invoiceItemRows = bounded(itemsResult, "source_invoice_items_failed", warnings);
    }
  }

  const initialInvoices = mapInvoices(invoiceRows, periodStart, periodEnd);
  const invoiceIds = new Set(initialInvoices.map((row) => String(row.id)));
  const allowedPropertyIds = new Set(propertyIds);
  const unverifiedScopeInvoiceIds = invoiceIdsWithOutsideScopeItems(
    invoiceItemRows, invoiceIds, allowedPropertyIds,
  );
  if (unverifiedScopeInvoiceIds.size && !warnings.includes("source_invoice_items_failed")) {
    warnings.push("source_invoice_items_failed");
  }
  const invoices = mapInvoices(
    invoiceRows, periodStart, periodEnd, unverifiedScopeInvoiceIds,
  );
  const expenses = consolidateExpenses(expenseRows, vendorRows, missionRows, periodStart, periodEnd);
  if (!expenses.safe && !warnings.includes("source_expenses_failed")) warnings.push("source_expenses_failed");

  const sourceUpdatedAt = latestUpdatedAt([
    propertyRows, allProperties, periods, bookings, calendarEvents, cashIncomes, expenseRows, vendorRows,
    missionRows, ownerLinks, invoiceRows, invoiceItemRows,
  ]);
  const uniqueWarnings = [...new Set(warnings)];
  return json(200, {
    state: uniqueWarnings.length ? "partial" : "ok",
    properties: mapProperties(occupancyPropertyRows).map((row) => ({
      ...row, online_periods: attested ? (periodMap.get(String(row.id)) ?? []) : undefined,
    })),
    online_scope_complete: attested && !occupancyWarnings.length,
    bookings: mapBookings(bookings),
    calendar_events: mapCalendarEvents(calendarEvents),
    invoices,
    invoice_items: mapInvoiceItems(invoiceItemRows, invoiceIds, allowedPropertyIds),
    cash_incomes: mapCashIncomes(cashIncomes),
    expenses: expenses.rows,
    source_updated_at: sourceUpdatedAt,
    warnings: uniqueWarnings,
  });
});

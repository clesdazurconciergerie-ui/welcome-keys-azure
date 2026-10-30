export const PARIS_TIMEZONE = "Europe/Paris";
export const MAX_ROWS = 1000;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type FinanceWarning =
  | "source_properties_failed"
  | "source_property_listing_periods_failed"
  | "source_bookings_failed"
  | "source_calendar_events_failed"
  | "source_invoices_failed"
  | "source_invoice_items_failed"
  | "source_cash_incomes_failed"
  | "source_expenses_failed";

type Row = Record<string, unknown>;

export function decimalString(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function civilDayNumber(value: string) {
  if (!DAY.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return null;
  return Math.floor(timestamp / 86_400_000);
}

export function validatePeriod(start: string, endExclusive: string, timezone: string) {
  const first = civilDayNumber(start);
  const last = civilDayNumber(endExclusive);
  if (timezone !== PARIS_TIMEZONE || first === null || last === null) return false;
  const nights = last - first;
  return nights >= 1 && nights <= 366;
}

export function shiftDay(value: string, offset: number) {
  const number = civilDayNumber(value);
  if (number === null) throw new Error("invalid_date");
  return new Date((number + offset) * 86_400_000).toISOString().slice(0, 10);
}

export function parisDay(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function inPeriod(day: unknown, start: string, endExclusive: string) {
  return typeof day === "string" && DAY.test(day) && day >= start && day < endExclusive;
}

export function mapProperties(rows: Row[]) {
  return rows.map((row) => ({ id: row.id, name: row.name }));
}

export function mapBookings(rows: Row[]) {
  return rows.map((row) => ({
    id: row.id,
    property_id: row.property_id,
    calendar_event_id: row.calendar_event_id ?? null,
    check_in: row.check_in,
    check_out: row.check_out,
    price_status: row.price_status,
  }));
}

export function mapCalendarEvents(rows: Row[]) {
  return rows.map((row) => ({
    id: row.id,
    property_id: row.property_id,
    start_date: row.start_date,
    end_date: row.end_date,
    event_type: row.event_type,
    status: row.status,
    platform: row.platform,
  }));
}

export function hasUnmatchedReservationEvents(bookingRows: Row[], eventRows: Row[]) {
  const linkedEventIds = new Set(
    bookingRows.map((row) => row.calendar_event_id).filter((value) => value !== null && value !== undefined).map(String),
  );
  const cancelled = new Set(["cancelled", "canceled", "annulé", "annule"]);
  return eventRows.some((row) => {
    const kind = String(row.event_type ?? "").toLowerCase();
    const status = String(row.status ?? "").toLowerCase();
    return (kind === "reservation" || kind === "booking") &&
      !cancelled.has(status) && !linkedEventIds.has(String(row.id));
  });
}

export function mapInvoices(
  rows: Row[],
  start: string,
  endExclusive: string,
  unverifiedScopeInvoiceIds = new Set<string>(),
) {
  return rows.filter((row) => {
    const paidDay = parisDay(row.paid_at);
    return inPeriod(row.issue_date, start, endExclusive) || inPeriod(paidDay, start, endExclusive);
  }).map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    issue_date: row.issue_date,
    paid_at: row.paid_at,
    scope_verified: !unverifiedScopeInvoiceIds.has(String(row.id)),
    currency: "EUR",
    subtotal: decimalString(row.subtotal),
    vat_amount: decimalString(row.vat_amount),
    total: decimalString(row.total),
    vat_enabled: typeof row.vat_enabled === "boolean" ? row.vat_enabled : null,
  }));
}

export function invoiceIdsWithOutsideScopeItems(
  rows: Row[],
  allowedInvoiceIds: Set<string>,
  allowedPropertyIds: Set<string>,
) {
  return new Set(rows.filter((row) =>
    allowedInvoiceIds.has(String(row.invoice_id)) && row.property_id !== null &&
    row.property_id !== undefined && !allowedPropertyIds.has(String(row.property_id))
  ).map((row) => String(row.invoice_id)));
}

export function mapInvoiceItems(
  rows: Row[],
  allowedInvoiceIds: Set<string>,
  allowedPropertyIds: Set<string>,
) {
  return rows.filter((row) =>
    allowedInvoiceIds.has(String(row.invoice_id)) &&
    (row.property_id === null || row.property_id === undefined ||
      allowedPropertyIds.has(String(row.property_id)))
  ).map((row) => ({
    id: row.id,
    invoice_id: row.invoice_id,
    line_type: row.line_type,
    // Stored line precision is preserved. Jarvis alone performs cent rounding and
    // reconciles this value with the stored invoice subtotal/TVA/total.
    total: decimalString(row.total),
  }));
}

export function mapCashIncomes(rows: Row[]) {
  return rows.map((row) => ({
    id: row.id,
    property_id: row.property_id,
    amount: decimalString(row.amount),
    income_date: row.income_date,
    currency: "EUR",
  }));
}

export function consolidateExpenses(
  expenses: Row[],
  vendorPayments: Row[],
  missions: Row[],
  start: string,
  endExclusive: string,
) {
  // `expenses` has no deployed paid status. Mixing it with paid missions or vendor
  // payments could double count the same operation, so ambiguous input is withheld.
  const unqualifiedExpenses = expenses.filter((row) => inPeriod(row.expense_date, start, endExclusive));
  const paidVendors = vendorPayments.filter((row) =>
    row.status === "paid" && inPeriod(row.date, start, endExclusive)
  );
  const paidMissions = missions.filter((row) => {
    const day = parisDay(row.start_at);
    return row.status === "paid" && inPeriod(day, start, endExclusive);
  });
  if (unqualifiedExpenses.length || (paidVendors.length && paidMissions.length)) {
    return { rows: [], safe: false };
  }
  const rows = [
    ...paidVendors.map((row) => ({
      id: `vendor_payment:${row.id}`,
      property_id: row.property_id,
      amount: decimalString(row.amount),
      paid_date: row.date,
      status: "paid",
      currency: "EUR",
      dedupe_key: `vendor_payment:${row.id}`,
    })),
    ...paidMissions.map((row) => ({
      id: `mission:${row.id}`,
      property_id: row.property_id,
      amount: decimalString(row.payout_amount),
      paid_date: parisDay(row.start_at),
      status: "paid",
      currency: "EUR",
      dedupe_key: `mission:${row.id}`,
    })),
  ];
  return { rows, safe: true };
}

export function latestUpdatedAt(groups: Row[][]) {
  let latest: string | null = null;
  let latestTime = -Infinity;
  for (const row of groups.flat()) {
    const value = row.updated_at ?? row.created_at;
    if (typeof value !== "string") continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp) && timestamp > latestTime) {
      latest = value;
      latestTime = timestamp;
    }
  }
  return latest;
}

export function emptyPayload(state: "partial" | "error", warnings: FinanceWarning[]) {
  return {
    state,
    properties: [],
    bookings: [],
    calendar_events: [],
    invoices: [],
    invoice_items: [],
    cash_incomes: [],
    expenses: [],
    source_updated_at: null,
    warnings,
  };
}

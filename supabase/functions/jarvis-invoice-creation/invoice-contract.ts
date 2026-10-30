export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{20,128}$/;

export type InvoiceCreationAction = "prepare" | "get" | "approve" | "create" | "result";

export type InvoiceLineInput = {
  line_id: string;
  booking_id?: string | null;
  property_id: string;
  line_type: "rental_manual" | "commission" | "service" | "pass_through_cost" | "adjustment";
  description: string;
  quantity: string;
  unit_price: string;
  vat_rate: string;
};

export type InvoiceDraftInput = {
  owner_id: string;
  issue_date: string;
  due_date?: string | null;
  period_start: string;
  period_end: string;
  type: "invoice" | "credit_note";
  currency: "EUR";
  lines: InvoiceLineInput[];
};

const DECIMAL_2 = /^-?(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const QUANTITY = /^(?:0|[1-9]\d{0,5})(?:\.\d{1,4})?$/;
const VAT_RATE = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/;

function validDay(value: unknown) {
  if (typeof value !== "string" || !DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateDraftInput(value: unknown): value is InvoiceDraftInput {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  if (!UUID.test(String(draft.owner_id ?? ""))) return false;
  if (!validDay(draft.issue_date) || !validDay(draft.period_start) || !validDay(draft.period_end)) return false;
  if (String(draft.period_start) > String(draft.period_end)) return false;
  if (draft.due_date !== null && draft.due_date !== undefined && !validDay(draft.due_date)) return false;
  if (draft.type !== "invoice" && draft.type !== "credit_note") return false;
  if (draft.currency !== "EUR") return false;
  if (!Array.isArray(draft.lines) || draft.lines.length < 1 || draft.lines.length > 100) return false;

  const lineIds = new Set<string>();
  return draft.lines.every((raw) => {
    if (!raw || typeof raw !== "object") return false;
    const line = raw as Record<string, unknown>;
    const lineId = String(line.line_id ?? "");
    if (!UUID.test(lineId) || lineIds.has(lineId)) return false;
    lineIds.add(lineId);
    if (!UUID.test(String(line.property_id ?? ""))) return false;
    if (line.booking_id !== null && line.booking_id !== undefined && !UUID.test(String(line.booking_id))) return false;
    if (!["rental_manual", "commission", "service", "pass_through_cost", "adjustment"].includes(String(line.line_type))) return false;
    if (typeof line.description !== "string" || line.description.trim().length < 1 || line.description.length > 300) return false;
    return typeof line.quantity === "string" && QUANTITY.test(line.quantity) && line.quantity !== "0" &&
      typeof line.unit_price === "string" && DECIMAL_2.test(line.unit_price) &&
      typeof line.vat_rate === "string" && VAT_RATE.test(line.vat_rate) && Number(line.vat_rate) <= 100;
  });
}

export function validatePrepareRequest(body: Record<string, unknown>) {
  const draftId = body.draft_id;
  const expectedVersion = body.expected_version;
  return validateDraftInput(body.draft) &&
    (draftId === null || draftId === undefined || UUID.test(String(draftId))) &&
    (expectedVersion === null || expectedVersion === undefined || (Number.isInteger(expectedVersion) && Number(expectedVersion) >= 1));
}

export function validateVersionRequest(body: Record<string, unknown>) {
  return UUID.test(String(body.draft_id ?? "")) &&
    Number.isInteger(body.version) && Number(body.version) >= 1 &&
    /^[0-9a-f]{64}$/.test(String(body.fingerprint ?? ""));
}

export function validateDraftReferenceRequest(body: Record<string, unknown>) {
  return UUID.test(String(body.draft_id ?? ""));
}

export function validateCreateRequest(body: Record<string, unknown>) {
  return validateVersionRequest(body) && IDEMPOTENCY_KEY.test(String(body.idempotency_key ?? ""));
}

export function validateResultRequest(body: Record<string, unknown>) {
  return IDEMPOTENCY_KEY.test(String(body.idempotency_key ?? ""));
}

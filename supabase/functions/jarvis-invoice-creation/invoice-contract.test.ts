import { describe, expect, it } from "vitest";
import {
  validateCreateRequest,
  validateDraftInput,
  validatePrepareRequest,
  validateResultRequest,
} from "./invoice-contract";

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

const validDraft = {
  owner_id: id("1"),
  issue_date: "2026-10-30",
  due_date: "2026-11-29",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
  type: "invoice" as const,
  currency: "EUR" as const,
  lines: [
    {
      line_id: id("2"),
      property_id: id("3"),
      booking_id: null,
      line_type: "service" as const,
      description: "Prestation",
      quantity: "1.25",
      unit_price: "80.00",
      vat_rate: "20.00",
    },
  ],
};

describe("invoice creation contract", () => {
  it("accepts decimal strings and never requires JS floating point amounts", () => {
    expect(validateDraftInput(validDraft)).toBe(true);
    expect(validatePrepareRequest({ draft: validDraft })).toBe(true);
  });

  it("rejects numeric prices, excessive precision and duplicate lines", () => {
    expect(validateDraftInput({ ...validDraft, lines: [{ ...validDraft.lines[0], unit_price: 80 }] })).toBe(false);
    expect(validateDraftInput({ ...validDraft, lines: [{ ...validDraft.lines[0], unit_price: "80.001" }] })).toBe(false);
    expect(validateDraftInput({ ...validDraft, lines: [validDraft.lines[0], validDraft.lines[0]] })).toBe(false);
  });

  it("requires an exact approved version and a durable idempotency key", () => {
    const base = { draft_id: id("4"), version: 2, fingerprint: "a".repeat(64) };
    expect(validateCreateRequest({ ...base, idempotency_key: "jarvis:invoice:2026-09:0001" })).toBe(true);
    expect(validateCreateRequest({ ...base, version: 1.5, idempotency_key: "jarvis:invoice:2026-09:0001" })).toBe(false);
    expect(validateResultRequest({ idempotency_key: "short" })).toBe(false);
  });

  it("keeps issue date distinct from later payment state", () => {
    expect(validateDraftInput({ ...validDraft, issue_date: "2026-08-31", period_start: "2026-08-01", period_end: "2026-08-31" })).toBe(true);
    expect(Object.hasOwn(validDraft, "paid_at")).toBe(false);
  });
});

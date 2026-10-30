import assert from "node:assert/strict";
import test from "node:test";
import {
  validateCreateRequest,
  validateDraftReferenceRequest,
  validateDraftInput,
  validatePrepareRequest,
  validateResultRequest,
} from "./invoice-contract.ts";

const id = (suffix) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;
const draft = {
  owner_id: id("1"),
  issue_date: "2026-10-30",
  due_date: "2026-11-29",
  period_start: "2026-09-01",
  period_end: "2026-09-30",
  type: "invoice",
  currency: "EUR",
  lines: [
    {
      line_id: id("2"), property_id: id("3"), booking_id: null,
      line_type: "service", description: "Prestation",
      quantity: "1.25", unit_price: "80.00", vat_rate: "20.00",
    },
  ],
};

test("accepts exact decimal strings", () => {
  assert.equal(validateDraftInput(draft), true);
  assert.equal(validatePrepareRequest({ draft }), true);
});

test("rejects JS numbers, excessive precision and duplicate line ids", () => {
  assert.equal(validateDraftInput({ ...draft, lines: [{ ...draft.lines[0], unit_price: 80 }] }), false);
  assert.equal(validateDraftInput({ ...draft, lines: [{ ...draft.lines[0], unit_price: "80.001" }] }), false);
  assert.equal(validateDraftInput({ ...draft, lines: [draft.lines[0], draft.lines[0]] }), false);
});

test("binds creation to an exact version, fingerprint and idempotency key", () => {
  const base = { draft_id: id("4"), version: 2, fingerprint: "a".repeat(64) };
  assert.equal(validateCreateRequest({ ...base, idempotency_key: "jarvis:invoice:2026-09:0001" }), true);
  assert.equal(validateCreateRequest({ ...base, version: 1.5, idempotency_key: "jarvis:invoice:2026-09:0001" }), false);
  assert.equal(validateResultRequest({ idempotency_key: "short" }), false);
});

test("approval lookup accepts only an opaque draft UUID", () => {
  assert.equal(validateDraftReferenceRequest({ draft_id: id("4") }), true);
  assert.equal(validateDraftReferenceRequest({ draft_id: "../../invoices" }), false);
});

test("payment date is not part of invoice creation", () => {
  assert.equal(validateDraftInput({ ...draft, issue_date: "2026-08-31" }), true);
  assert.equal(Object.hasOwn(draft, "paid_at"), false);
});

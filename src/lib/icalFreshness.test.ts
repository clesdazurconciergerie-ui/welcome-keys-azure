import { describe, expect, it } from "vitest";
import { getICalFreshness } from "./icalFreshness";

const NOW = new Date("2026-10-30T12:00:00.000Z").getTime();

describe("getICalFreshness", () => {
  it("n'affiche jamais une santé excellente sans succès réel", () => {
    expect(getICalFreshness(null, true, NOW).state).toBe("never");
  });

  it("classe les données selon la fraîcheur du dernier succès", () => {
    expect(getICalFreshness("2026-10-30T07:00:00.000Z", true, NOW).state).toBe("fresh");
    expect(getICalFreshness("2026-10-30T03:00:00.000Z", true, NOW).state).toBe("attention");
    expect(getICalFreshness("2026-10-29T20:00:00.000Z", true, NOW).state).toBe("stale");
  });

  it("distingue une planification en pause d'une synchronisation en panne", () => {
    expect(getICalFreshness(null, false, NOW).state).toBe("paused");
  });
});

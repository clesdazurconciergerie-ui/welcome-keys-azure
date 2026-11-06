import { describe, expect, it } from "vitest";
import { getICalExportConnectionState } from "./ical-export-status";

describe("getICalExportConnectionState", () => {
  it("signale un lien désactivé même s'il a déjà été consulté", () => {
    expect(
      getICalExportConnectionState({
        isActive: false,
        lastAccessedAt: "2026-11-06T09:00:00.000Z",
      })
    ).toBe("disabled");
  });

  it("n'annonce pas une connexion avant la première consultation", () => {
    expect(getICalExportConnectionState({ isActive: true, lastAccessedAt: null })).toBe("waiting");
  });

  it("confirme la consultation d'un lien actif", () => {
    expect(
      getICalExportConnectionState({
        isActive: true,
        lastAccessedAt: "2026-11-06T09:00:00.000Z",
      })
    ).toBe("connected");
  });
});

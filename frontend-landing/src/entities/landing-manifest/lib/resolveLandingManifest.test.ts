import { describe, expect, it } from "vitest";
import { resolveLandingManifest } from "./resolveLandingManifest";

describe("resolveLandingManifest", () => {
  it("resolves allowlisted host", () => {
    expect(resolveLandingManifest("lp1.flirto.guru")?.landing_id).toBe("lp1");
  });

  it("returns null for unknown host", () => {
    expect(resolveLandingManifest("unknown.flirto.guru")).toBeNull();
  });
});

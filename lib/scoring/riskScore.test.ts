import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeRiskScore } from "./riskScore";

describe("computeRiskScore", () => {
  it("applies all damage severity multipliers", () => {
    const registrant = { dependencies: ["oxygen"] as const };

    assert.equal(computeRiskScore(registrant, { severity: "none" }, 0), 0);
    assert.equal(computeRiskScore(registrant, { severity: "minor" }, 0), 0.5);
    assert.equal(computeRiskScore(registrant, { severity: "major" }, 0), 1.5);
    assert.equal(computeRiskScore(registrant, { severity: "destroyed" }, 0), 2.5);
  });

  it("treats null damage as no current damage", () => {
    assert.equal(computeRiskScore({ dependencies: ["oxygen"] }, null, 0), 0);
  });

  it("uses a neutral contact multiplier when hoursSinceContact is null", () => {
    assert.equal(
      computeRiskScore({ dependencies: ["dialysis"] }, { severity: "destroyed" }, null),
      2.5,
    );
  });

  it("sums multiple dependency weights before applying multipliers", () => {
    const score = computeRiskScore(
      { dependencies: ["oxygen", "mobility", "lives_alone", "medication_critical"] },
      { severity: "major" },
      12,
    );

    assert.ok(Math.abs(score - 8.4) < 1e-12);
  });
});

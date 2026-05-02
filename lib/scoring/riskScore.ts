import type { DamageSeverity, Dependency } from "@/lib/db/schema";

export const DEPENDENCY_WEIGHTS = {
  oxygen: 1.0,
  dialysis: 1.0,
  mobility: 0.7,
  deaf_hoh: 0.5,
  blind_lv: 0.5,
  cognitive: 0.7,
  lives_alone: 0.3,
  child_at_home: 0.4,
  limited_english: 0.3,
  medication_critical: 0.8,
} satisfies Record<Dependency, number>;

const DAMAGE_MULTIPLIERS = {
  none: 0.0,
  minor: 0.5,
  major: 1.5,
  destroyed: 2.5,
} satisfies Record<DamageSeverity, number>;

export type RiskScoreRegistrant = {
  dependencies: readonly Dependency[];
};

export type RiskScoreDamage = {
  severity: DamageSeverity | null;
} | null;

export function sumDependencyWeights(dependencies: readonly Dependency[]): number {
  return dependencies.reduce((sum, dependency) => sum + DEPENDENCY_WEIGHTS[dependency], 0);
}

export function computeRiskScore(
  registrant: RiskScoreRegistrant,
  damageHere: RiskScoreDamage,
  hoursSinceContact: number | null,
): number {
  const depWeight = sumDependencyWeights(registrant.dependencies);
  const damageMultiplier = DAMAGE_MULTIPLIERS[damageHere?.severity ?? "none"];
  const contactMultiplier =
    hoursSinceContact === null ? 1.0 : Math.min(1 + hoursSinceContact / 12, 3.0);

  return depWeight * damageMultiplier * contactMultiplier;
}

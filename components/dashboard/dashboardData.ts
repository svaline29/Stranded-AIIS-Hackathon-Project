import { booleanPointInPolygon, point } from "@turf/turf";
import type { DamageFeatureCollection, Registrant } from "@/components/map/types";
import type { DamageSeverity, Dependency } from "@/lib/db/schema";
import { computeRiskScore, DEPENDENCY_WEIGHTS } from "@/lib/scoring/riskScore";

export type PriorityTier = "P1" | "P2" | "P3" | "P4";

export type EnrichedRegistrant = Registrant & {
  damageSeverity: DamageSeverity;
  damagePolygonId: string | null;
  hoursSinceContact: number | null;
  riskScore: number;
  priorityTier: PriorityTier;
  primaryDependency: Dependency | null;
  resourceTags: string[];
};

export type DashboardData = {
  damage: DamageFeatureCollection;
  registrants: Registrant[];
  enrichedRegistrants: EnrichedRegistrant[];
};

const DAMAGE_SEVERITY_RANK = {
  none: 0,
  minor: 1,
  major: 2,
  destroyed: 3,
} satisfies Record<DamageSeverity, number>;

export const RESOURCE_TAGS_BY_DEPENDENCY = {
  oxygen: ["medical_o2", "portable_O2"],
  dialysis: ["dialysis_transport"],
  mobility: ["wheelchair_accessible_transport"],
  deaf_hoh: ["asl_interpreter"],
  blind_lv: ["sighted_guide"],
  cognitive: ["cognitive_support_team"],
  lives_alone: ["welfare_check"],
  limited_english: ["translator"],
  child_at_home: ["child_services"],
  medication_critical: ["pharmacy_courier", "medical_advanced"],
} satisfies Record<Dependency, string[]>;

type TurfPolygonInput = Parameters<typeof booleanPointInPolygon>[1];

export function formatDependencyLabel(dependency: Dependency): string {
  return dependency
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSeverityLabel(severity: DamageSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function getPriorityTier(riskScore: number): PriorityTier {
  if (riskScore >= 3.0) {
    return "P1";
  }
  if (riskScore >= 1.5) {
    return "P2";
  }
  if (riskScore >= 0.5) {
    return "P3";
  }
  return "P4";
}

export function getPrimaryDependency(dependencies: readonly Dependency[]): Dependency | null {
  return dependencies.reduce<Dependency | null>((highest, dependency) => {
    if (highest === null) {
      return dependency;
    }

    return DEPENDENCY_WEIGHTS[dependency] > DEPENDENCY_WEIGHTS[highest] ? dependency : highest;
  }, null);
}

export function getResourceTags(dependencies: readonly Dependency[]): string[] {
  return Array.from(
    new Set(dependencies.flatMap((dependency) => RESOURCE_TAGS_BY_DEPENDENCY[dependency])),
  );
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [damageResponse, registrantsResponse] = await Promise.all([
    fetch("/api/damage"),
    fetch("/api/registrants"),
  ]);

  if (!damageResponse.ok || !registrantsResponse.ok) {
    throw new Error("Unable to load dashboard data from the local API");
  }

  const damage = (await damageResponse.json()) as DamageFeatureCollection;
  const registrants = (await registrantsResponse.json()) as Registrant[];

  return {
    damage,
    registrants,
    enrichedRegistrants: enrichRegistrants(registrants, damage),
  };
}

export function enrichRegistrants(
  registrants: readonly Registrant[],
  damage: DamageFeatureCollection,
): EnrichedRegistrant[] {
  return registrants
    .map((registrant) => enrichRegistrant(registrant, damage))
    .sort((left, right) => right.riskScore - left.riskScore);
}

function enrichRegistrant(
  registrant: Registrant,
  damage: DamageFeatureCollection,
): EnrichedRegistrant {
  const damageHere = findHighestSeverityDamage(registrant, damage);
  const hoursSinceContact =
    registrant.lastContactAt === null
      ? null
      : Math.max(0, (Date.now() - registrant.lastContactAt) / 1000 / 60 / 60);
  const riskScore = computeRiskScore(registrant, damageHere, hoursSinceContact);

  return {
    ...registrant,
    damageSeverity: damageHere?.severity ?? "none",
    damagePolygonId: damageHere?.id ?? null,
    hoursSinceContact,
    riskScore,
    priorityTier: getPriorityTier(riskScore),
    primaryDependency: getPrimaryDependency(registrant.dependencies),
    resourceTags: getResourceTags(registrant.dependencies),
  };
}

function findHighestSeverityDamage(
  registrant: Registrant,
  damage: DamageFeatureCollection,
): { id: string; severity: DamageSeverity } | null {
  const registrantPoint = point([registrant.lon, registrant.lat]);

  return damage.features.reduce<{ id: string; severity: DamageSeverity } | null>(
    (highest, feature) => {
      if (!booleanPointInPolygon(registrantPoint, feature as TurfPolygonInput)) {
        return highest;
      }

      const currentSeverity = feature.properties.severity;
      if (
        highest === null ||
        DAMAGE_SEVERITY_RANK[currentSeverity] > DAMAGE_SEVERITY_RANK[highest.severity]
      ) {
        return {
          id: feature.properties.id,
          severity: currentSeverity,
        };
      }

      return highest;
    },
    null,
  );
}

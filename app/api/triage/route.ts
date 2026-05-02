import { randomUUID } from "crypto";
import { booleanPointInPolygon, point } from "@turf/turf";
import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { runDispatchAgent } from "@/lib/agents/dispatch";
import { runResourceMatcherAgent } from "@/lib/agents/resourceMatcher";
import { runTriageAgent, type TriageOutput } from "@/lib/agents/triage";
import { getDb } from "@/lib/db/client";
import { damagePolygons, dispatchBriefings, registrants } from "@/lib/db/schema";
import type { DamageSeverity, Dependency } from "@/lib/db/schema";
import { computeRiskScore } from "@/lib/scoring/riskScore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_TTL_MS = 10 * 60 * 1000;

const requestSchema = z.object({
  registrantId: z.string(),
});

const DEPENDENCIES: readonly Dependency[] = [
  "oxygen",
  "dialysis",
  "mobility",
  "deaf_hoh",
  "blind_lv",
  "cognitive",
  "lives_alone",
  "child_at_home",
  "limited_english",
  "medication_critical",
];

const DAMAGE_RANK = {
  none: 0,
  minor: 1,
  major: 2,
  destroyed: 3,
} satisfies Record<DamageSeverity, number>;

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
};

type DamageContext = {
  severity: DamageSeverity;
  polygonNotes: string | null;
};

type AgentResult = {
  registrantId: string;
  riskScore: number;
  triage: TriageOutput;
  dispatch: {
    briefing: string;
    access_notes: string | null;
    priority_action: string;
  };
  resourceMatcher: {
    resource_tags: string[];
    rationale: string;
  };
  generatedAt: number;
  cached: boolean;
  fallback: boolean;
};

export async function POST(request: Request) {
  let registrantId: string;

  try {
    const body: unknown = await request.json();
    registrantId = requestSchema.parse(body).registrantId;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const registrant = getDb()
    .select()
    .from(registrants)
    .where(eq(registrants.id, registrantId))
    .limit(1)
    .get();

  if (registrant === undefined) {
    return Response.json({ error: "Registrant not found" }, { status: 404 });
  }

  const freshAfter = Date.now() - CACHE_TTL_MS;
  const cached = getDb()
    .select()
    .from(dispatchBriefings)
    .where(
      and(
        eq(dispatchBriefings.registrantId, registrantId),
        gt(dispatchBriefings.generatedAt, freshAfter),
      ),
    )
    .orderBy(desc(dispatchBriefings.generatedAt))
    .limit(1)
    .get();

  if (cached !== undefined) {
    return Response.json(resultFromRow(cached, true, false));
  }

  const dependencies = parseDependencies(registrant.dependencies, registrant.id);
  const damage = findDamageContext(registrant.lon, registrant.lat);
  const hoursSinceContact =
    registrant.lastContactAt === null
      ? null
      : Math.max(0, (Date.now() - registrant.lastContactAt) / 1000 / 60 / 60);
  const riskScore = computeRiskScore({ dependencies }, damage, hoursSinceContact);

  try {
    const triage = normalizeTriage(
      await runTriageAgent({
        registrant: {
          id: registrant.id,
          fullName: registrant.fullName,
          age: registrant.age,
          dependencies,
          primaryLanguage: registrant.primaryLanguage,
          lives_alone: dependencies.includes("lives_alone"),
          lastContactAt: registrant.lastContactAt,
        },
        damage,
        hoursSinceContact,
      }),
      dependencies,
      damage,
      hoursSinceContact,
    );
    const dispatch = await runDispatchAgent({
      registrant: {
        id: registrant.id,
        fullName: registrant.fullName,
        age: registrant.age,
        address: registrant.address,
        dependencies,
      },
      damage,
      triage,
      hoursSinceContact,
    });
    const resourceMatcher = normalizeResourceMatcher(
      await runResourceMatcherAgent({
        registrantId: registrant.id,
        dependencies,
        priority_tier: triage.priority_tier,
      }),
      dependencies,
      triage.priority_tier,
      registrant.primaryLanguage,
    );

    const result = {
      registrantId: registrant.id,
      riskScore,
      triage,
      dispatch,
      resourceMatcher,
      generatedAt: Date.now(),
      cached: false,
      fallback: false,
    } satisfies AgentResult;

    insertBriefing(result);
    return Response.json(result);
  } catch (error) {
    console.error(`[triage] ${registrant.id}: agent failure`, error);

    const result = buildFallbackResult({
      registrant: {
        id: registrant.id,
        fullName: registrant.fullName,
        age: registrant.age,
        address: registrant.address,
        primaryLanguage: registrant.primaryLanguage,
      },
      dependencies,
      damage,
      hoursSinceContact,
      riskScore,
    });

    insertBriefing(result);
    return Response.json(result);
  }
}

function findDamageContext(lon: number, lat: number): DamageContext {
  const registrantPoint = point([lon, lat]);
  const polygons = getDb().select().from(damagePolygons).all();

  return polygons.reduce<DamageContext>(
    (highest, polygonRow) => {
      const geometry = parsePolygonGeometry(polygonRow.geometry, polygonRow.id);

      if (!booleanPointInPolygon(registrantPoint, geometry)) {
        return highest;
      }

      if (DAMAGE_RANK[polygonRow.severity] > DAMAGE_RANK[highest.severity]) {
        return {
          severity: polygonRow.severity,
          polygonNotes: polygonRow.notes,
        };
      }

      return highest;
    },
    { severity: "none", polygonNotes: null },
  );
}

function buildFallbackResult({
  registrant,
  dependencies,
  damage,
  hoursSinceContact,
  riskScore,
}: {
  registrant: {
    id: string;
    fullName: string;
    age: number | null;
    address: string;
    primaryLanguage: string;
  };
  dependencies: Dependency[];
  damage: DamageContext;
  hoursSinceContact: number | null;
  riskScore: number;
}): AgentResult {
  const priorityTier = getPriorityTier(riskScore);
  const primaryConcern = getFallbackConcern(dependencies, damage);
  const resourceTags = getFallbackResourceTags(dependencies, priorityTier, registrant.primaryLanguage);
  const contactText =
    hoursSinceContact === null
      ? "No prior contact recorded"
      : `Last contact ${Math.round(hoursSinceContact)} hours ago`;

  return {
    registrantId: registrant.id,
    riskScore,
    triage: {
      priority_tier: priorityTier,
      primary_concern: primaryConcern,
      immediate_risks: getFallbackRisks(dependencies, damage),
      time_sensitivity: getFallbackTimeSensitivity(dependencies, damage),
      confidence: 0.45,
    },
    dispatch: {
      briefing: `${priorityTier}: ${registrant.fullName}, age ${registrant.age ?? "unknown"}, at ${registrant.address}. Dependencies: ${dependencies.join(", ") || "none listed"}. Damage severity ${damage.severity}. ${contactText}.`,
      access_notes: damage.polygonNotes,
      priority_action: getFallbackPriorityAction(dependencies),
    },
    resourceMatcher: {
      resource_tags: resourceTags,
      rationale: "Fallback mapping from dependencies and priority.",
    },
    generatedAt: Date.now(),
    cached: false,
    fallback: true,
  };
}

function insertBriefing(result: AgentResult) {
  getDb().insert(dispatchBriefings)
    .values({
      id: randomUUID(),
      registrantId: result.registrantId,
      riskScore: result.riskScore,
      briefing: result.dispatch.briefing,
      accessNotes: result.dispatch.access_notes,
      priorityAction: result.dispatch.priority_action,
      priorityTier: result.triage.priority_tier,
      primaryConcern: result.triage.primary_concern,
      immediateRisks: JSON.stringify(result.triage.immediate_risks),
      timeSensitivity: result.triage.time_sensitivity,
      confidence: result.triage.confidence,
      resourceTags: JSON.stringify(result.resourceMatcher.resource_tags),
      generatedAt: result.generatedAt,
    })
    .run();
}

function resultFromRow(
  row: typeof dispatchBriefings.$inferSelect,
  cached: boolean,
  fallback: boolean,
): AgentResult {
  return {
    registrantId: row.registrantId,
    riskScore: row.riskScore,
    triage: {
      priority_tier: row.priorityTier,
      primary_concern: row.primaryConcern,
      immediate_risks: parseStringArray(row.immediateRisks),
      time_sensitivity: row.timeSensitivity,
      confidence: row.confidence,
    },
    dispatch: {
      briefing: row.briefing,
      access_notes: row.accessNotes,
      priority_action: row.priorityAction,
    },
    resourceMatcher: {
      resource_tags: parseStringArray(row.resourceTags),
      rationale: cached ? "Cached briefing reused." : "Generated briefing.",
    },
    generatedAt: row.generatedAt,
    cached,
    fallback,
  };
}

function parseDependencies(value: string, id: string): Dependency[] {
  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed) || !parsed.every(isDependency)) {
    throw new Error(`registrants row ${id} has invalid dependencies JSON`);
  }

  return parsed;
}

function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
}

function isDependency(value: unknown): value is Dependency {
  return typeof value === "string" && DEPENDENCIES.includes(value as Dependency);
}

function parsePolygonGeometry(value: string, id: string): GeoJsonPolygon {
  const parsed: unknown = JSON.parse(value);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("type" in parsed) ||
    parsed.type !== "Polygon" ||
    !("coordinates" in parsed) ||
    !Array.isArray(parsed.coordinates)
  ) {
    throw new Error(`damage_polygons row ${id} does not contain valid Polygon GeoJSON`);
  }

  return parsed as GeoJsonPolygon;
}

function getPriorityTier(riskScore: number): "P1" | "P2" | "P3" | "P4" {
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

function normalizeTriage(
  triage: TriageOutput,
  dependencies: Dependency[],
  damage: DamageContext,
  hoursSinceContact: number | null,
): TriageOutput {
  const hasLifeCriticalDependency =
    dependencies.includes("oxygen") ||
    dependencies.includes("dialysis") ||
    dependencies.includes("medication_critical");

  if (damage.severity !== "none" || hasLifeCriticalDependency || hoursSinceContact !== null) {
    return triage;
  }

  return {
    ...triage,
    priority_tier: "P4",
    primary_concern: "No mapped damage exposure",
    time_sensitivity: "none",
  };
}

function normalizeResourceMatcher(
  resourceMatcher: AgentResult["resourceMatcher"],
  dependencies: Dependency[],
  priorityTier: "P1" | "P2" | "P3" | "P4",
  primaryLanguage: string,
): AgentResult["resourceMatcher"] {
  const allowedTags = new Set(getFallbackResourceTags(dependencies, priorityTier, primaryLanguage));
  const filteredTags = resourceMatcher.resource_tags.filter((tag) => allowedTags.has(tag));
  const tags = filteredTags.length >= 2 ? filteredTags : Array.from(allowedTags).slice(0, 6);

  return {
    ...resourceMatcher,
    resource_tags: tags,
  };
}

function getFallbackConcern(dependencies: Dependency[], damage: DamageContext): string {
  if (dependencies.includes("oxygen")) {
    return "Oxygen support at damaged residence";
  }
  if (dependencies.includes("dialysis")) {
    return "Dialysis access interruption";
  }
  if (dependencies.includes("medication_critical")) {
    return "Critical medication interruption";
  }
  if (damage.severity === "destroyed" || damage.severity === "major") {
    return "Structural damage exposure";
  }
  return "Welfare check needed";
}

function getFallbackRisks(dependencies: Dependency[], damage: DamageContext): string[] {
  const risks = new Set<string>();

  if (dependencies.includes("oxygen")) {
    risks.add("Oxygen depletion");
  }
  if (dependencies.includes("dialysis")) {
    risks.add("Missed dialysis window");
  }
  if (dependencies.includes("medication_critical")) {
    risks.add("Critical medication lapse");
  }
  if (dependencies.includes("lives_alone")) {
    risks.add("No on-scene support");
  }
  if (dependencies.includes("cognitive")) {
    risks.add("Impaired self-evacuation");
  }
  if (damage.severity === "destroyed" || damage.severity === "major") {
    risks.add("Unsafe structure");
  }

  return Array.from(risks).slice(0, 4);
}

function getFallbackTimeSensitivity(
  dependencies: Dependency[],
  damage: DamageContext,
): "hours" | "days" | "weeks" | "none" {
  if (
    dependencies.includes("oxygen") ||
    dependencies.includes("dialysis") ||
    dependencies.includes("medication_critical")
  ) {
    return "hours";
  }
  if (damage.severity === "destroyed" || damage.severity === "major") {
    return "days";
  }
  if (damage.severity === "minor") {
    return "weeks";
  }
  return "none";
}

function getFallbackPriorityAction(dependencies: Dependency[]): string {
  if (dependencies.includes("oxygen")) {
    return "Confirm oxygen supply and move portable O2 to bedside.";
  }
  if (dependencies.includes("dialysis")) {
    return "Confirm dialysis timing and arrange transport now.";
  }
  if (dependencies.includes("medication_critical")) {
    return "Verify medication supply and request pharmacy courier.";
  }
  return "Make face-to-face contact and confirm safety.";
}

function getFallbackResourceTags(
  dependencies: Dependency[],
  priorityTier: "P1" | "P2" | "P3" | "P4",
  primaryLanguage: string,
): string[] {
  const tags = new Set<string>([priorityTier === "P4" ? "wellness_check" : "medical_basic"]);

  for (const dependency of dependencies) {
    if (dependency === "oxygen") tags.add("medical_o2");
    if (dependency === "dialysis") tags.add("dialysis_transport");
    if (dependency === "mobility") tags.add("wheelchair_accessible_transport");
    if (dependency === "deaf_hoh") tags.add("asl_interpreter");
    if (dependency === "blind_lv") tags.add("sighted_guide");
    if (dependency === "cognitive") tags.add("cognitive_support_team");
    if (dependency === "child_at_home") tags.add("child_services");
    if (dependency === "medication_critical") {
      tags.add("medical_advanced");
      tags.add("pharmacy_courier");
    }
    if (dependency === "limited_english") tags.add(getTranslatorTag(primaryLanguage));
  }

  return Array.from(tags).slice(0, 6);
}

function getTranslatorTag(primaryLanguage: string): "translator_es" | "translator_so" | "translator_hmn" {
  if (primaryLanguage === "so") {
    return "translator_so";
  }
  if (primaryLanguage === "hmn") {
    return "translator_hmn";
  }
  return "translator_es";
}

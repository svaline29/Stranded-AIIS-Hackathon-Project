import { getDb } from "@/lib/db/client";
import { registrants } from "@/lib/db/schema";
import type { Dependency } from "@/lib/db/schema";
import type { Registrant } from "@/components/map/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function isDependency(value: unknown): value is Dependency {
  return typeof value === "string" && DEPENDENCIES.includes(value as Dependency);
}

function parseDependencies(value: string, id: string): Dependency[] {
  const parsed: unknown = JSON.parse(value);

  if (!Array.isArray(parsed) || !parsed.every(isDependency)) {
    throw new Error(`registrants row ${id} has invalid dependencies JSON`);
  }

  return parsed;
}

export async function GET() {
  const rows = getDb().select().from(registrants).all();

  const response: Registrant[] = rows.map((row) => ({
    ...row,
    dependencies: parseDependencies(row.dependencies, row.id),
  }));

  return Response.json(response);
}

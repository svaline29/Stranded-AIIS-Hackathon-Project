import { db } from "@/lib/db/client";
import { damagePolygons } from "@/lib/db/schema";
import type { DamageFeatureCollection } from "@/components/map/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: [number, number][][];
};

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

function parsePolygonGeometry(value: string, id: string): GeoJsonPolygon {
  const parsed: unknown = JSON.parse(value);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("type" in parsed) ||
    parsed.type !== "Polygon" ||
    !("coordinates" in parsed) ||
    !Array.isArray(parsed.coordinates) ||
    !parsed.coordinates.every(
      (ring) => Array.isArray(ring) && ring.every((position) => isPosition(position)),
    )
  ) {
    throw new Error(`damage_polygons row ${id} does not contain valid Polygon GeoJSON`);
  }

  return parsed as GeoJsonPolygon;
}

export async function GET() {
  const rows = db.select().from(damagePolygons).all();

  const collection: DamageFeatureCollection = {
    type: "FeatureCollection",
    features: rows.map((row) => {
      if (row.severity === "none") {
        throw new Error(`damage_polygons row ${row.id} has unsupported severity "none"`);
      }

      return {
        type: "Feature",
        id: row.id,
        properties: {
          id: row.id,
          severity: row.severity,
          source: row.source,
          detectedAt: row.detectedAt,
          notes: row.notes,
        },
        geometry: parsePolygonGeometry(row.geometry, row.id),
      };
    }),
  };

  return Response.json(collection);
}

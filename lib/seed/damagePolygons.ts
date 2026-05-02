import * as fs from "fs";
import * as path from "path";
import { getDb } from "../db/client";
import { damagePolygons } from "../db/schema";
import type { DamageSeverity } from "../db/schema";

type Position = [number, number];

type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: Position[][];
};

export type SeedDamagePolygon = {
  id: string;
  geometry: GeoJsonPolygon;
  severity: Exclude<DamageSeverity, "none">;
  source: "manual";
  notes: string | null;
};

const SEEDED_AT = Date.UTC(2024, 8, 27, 12, 0, 0);
const EXPECTED_POLYGON_COUNT = 10;

type DamageFeature = {
  type: "Feature";
  properties: {
    severity: Exclude<DamageSeverity, "none">;
    notes?: string;
  };
  geometry: GeoJsonPolygon;
};

type DamageFeatureCollection = {
  type: "FeatureCollection";
  features: DamageFeature[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDamageSeverity(value: unknown): value is Exclude<DamageSeverity, "none"> {
  return value === "minor" || value === "major" || value === "destroyed";
}

function parseDamagePolygonGeoJson(value: unknown): DamageFeatureCollection {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error("damagePolygons.geojson must be a GeoJSON FeatureCollection");
  }

  if (value.features.length !== EXPECTED_POLYGON_COUNT) {
    throw new Error(
      `damagePolygons.geojson must contain ${EXPECTED_POLYGON_COUNT} features; found ${value.features.length}`,
    );
  }

  const features = value.features.map((feature, index): DamageFeature => {
    if (!isRecord(feature) || feature.type !== "Feature") {
      throw new Error(`damagePolygons.geojson features[${index}] is not a GeoJSON Feature`);
    }
    if (!isRecord(feature.properties)) {
      throw new Error(`damagePolygons.geojson features[${index}] is missing properties`);
    }
    if (!isRecord(feature.geometry) || feature.geometry.type !== "Polygon") {
      throw new Error(`damagePolygons.geojson features[${index}] must have Polygon geometry`);
    }
    if (!Array.isArray(feature.geometry.coordinates)) {
      throw new Error(`damagePolygons.geojson features[${index}] is missing geometry coordinates`);
    }

    const severity = feature.properties.severity;
    if (!isDamageSeverity(severity)) {
      throw new Error(
        `damagePolygons.geojson features[${index}] has invalid severity: ${String(severity)}`,
      );
    }

    const notes = feature.properties.notes;
    if (notes !== undefined && typeof notes !== "string") {
      throw new Error(`damagePolygons.geojson features[${index}] properties.notes must be a string`);
    }

    return {
      type: "Feature",
      properties: {
        severity,
        notes,
      },
      geometry: feature.geometry as GeoJsonPolygon,
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function loadDamagePolygons(): SeedDamagePolygon[] {
  const geoJsonPath = path.join(process.cwd(), "notes", "damagePolygons.geojson");
  const rawGeoJson = fs.readFileSync(geoJsonPath, "utf8");
  const featureCollection = parseDamagePolygonGeoJson(JSON.parse(rawGeoJson) as unknown);

  return featureCollection.features.map((feature, index) => ({
    id: `manual-${String(index + 1).padStart(3, "0")}`,
    geometry: feature.geometry,
    severity: feature.properties.severity,
    source: "manual",
    notes: feature.properties.notes ?? null,
  }));
}

// Real polygons traced from neighborhood-level knowledge of Hurricane Helene damage in Asheville/Swannanoa, Sept 2024. See notes/sources.md.
export const manualDamagePolygons: SeedDamagePolygon[] = loadDamagePolygons();

export function seedDamagePolygons(): void {
  getDb().delete(damagePolygons).run();

  for (const polygon of manualDamagePolygons) {
    getDb()
      .insert(damagePolygons)
      .values({
        id: polygon.id,
        geometry: JSON.stringify(polygon.geometry),
        severity: polygon.severity,
        source: polygon.source,
        detectedAt: SEEDED_AT,
        notes: polygon.notes,
      })
      .onConflictDoUpdate({
        target: damagePolygons.id,
        set: {
          geometry: JSON.stringify(polygon.geometry),
          severity: polygon.severity,
          source: polygon.source,
          detectedAt: SEEDED_AT,
          notes: polygon.notes,
        },
      })
      .run();
  }

  console.log(`✓ damage_polygons seeded (${manualDamagePolygons.length} manual)`);
}

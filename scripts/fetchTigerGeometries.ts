import * as fs from "fs";
import * as path from "path";

const TIGERWEB_BLOCK_GROUPS_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/8/query?where=COUNTY%3D%27021%27%20AND%20STATE%3D%2737%27&outFields=GEOID,NAME&outSR=4326&returnGeometry=true&f=geojson";

type BlockGroupProperties = {
  GEOID: string;
  NAMELSAD: string | null;
};

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

type BlockGroupGeometry = PolygonGeometry | MultiPolygonGeometry;

type BlockGroupFeature = {
  type: "Feature";
  properties: BlockGroupProperties;
  geometry: BlockGroupGeometry;
};

type BlockGroupFeatureCollection = {
  type: "FeatureCollection";
  features: BlockGroupFeature[];
};

type AcsBlockGroup = {
  geoid: string;
};

type AcsCache = {
  blockGroups: AcsBlockGroup[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseAcsCache(value: unknown): AcsCache {
  if (!isRecord(value) || !Array.isArray(value.blockGroups)) {
    throw new Error("public/data/acs.json is missing blockGroups[]");
  }

  const blockGroups = value.blockGroups.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`ACS blockGroups[${index}] is not an object`);
    }

    const geoid = getString(row.geoid);
    if (geoid === null) {
      throw new Error(`ACS blockGroups[${index}] is missing geoid`);
    }

    return { geoid };
  });

  return { blockGroups };
}

function parseTigerGeoJson(value: unknown): BlockGroupFeatureCollection {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error("TIGERweb response was not a GeoJSON FeatureCollection");
  }

  const features = value.features.map((feature, index): BlockGroupFeature => {
    if (!isRecord(feature) || feature.type !== "Feature") {
      throw new Error(`TIGERweb features[${index}] is not a GeoJSON Feature`);
    }
    if (!isRecord(feature.properties)) {
      throw new Error(`TIGERweb features[${index}] is missing properties`);
    }
    if (!isRecord(feature.geometry)) {
      throw new Error(`TIGERweb features[${index}] is missing geometry`);
    }

    const geoid = getString(feature.properties.GEOID);
    if (geoid === null) {
      throw new Error(`TIGERweb features[${index}] is missing properties.GEOID`);
    }

    const namelsad = getString(feature.properties.NAMELSAD) ?? getString(feature.properties.NAME);
    const geometryType = feature.geometry.type;
    if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") {
      throw new Error(`TIGERweb features[${index}] has unsupported geometry ${String(geometryType)}`);
    }

    return {
      type: "Feature",
      properties: {
        GEOID: geoid,
        NAMELSAD: namelsad,
      },
      geometry: feature.geometry as BlockGroupGeometry,
    };
  });

  features.sort((a, b) => a.properties.GEOID.localeCompare(b.properties.GEOID));

  return {
    type: "FeatureCollection",
    features,
  };
}

async function main(): Promise<void> {
  console.log("=== fetchTigerGeometries.ts ===");
  console.log("Fetching Buncombe County NC block group polygons from Census TIGERweb...");

  const response = await fetch(TIGERWEB_BLOCK_GROUPS_URL);
  if (!response.ok) {
    throw new Error(`TIGERweb ${response.status}: ${await response.text()}`);
  }

  const geojson = parseTigerGeoJson(await response.json());
  const acsPath = path.join(process.cwd(), "public", "data", "acs.json");
  const acs = parseAcsCache(JSON.parse(fs.readFileSync(acsPath, "utf8")) as unknown);
  const acsGeoids = new Set(acs.blockGroups.map((blockGroup) => blockGroup.geoid));

  const extraGeometryGeoids = geojson.features
    .map((feature) => feature.properties.GEOID)
    .filter((geoid) => !acsGeoids.has(geoid));
  const missingGeometryGeoids = acs.blockGroups
    .map((blockGroup) => blockGroup.geoid)
    .filter((geoid) => !geojson.features.some((feature) => feature.properties.GEOID === geoid));

  if (extraGeometryGeoids.length > 0 || missingGeometryGeoids.length > 0) {
    throw new Error(
      [
        "TIGERweb GEOIDs did not match ACS block group GEOIDs.",
        `Extra geometry GEOIDs: ${extraGeometryGeoids.join(", ") || "none"}`,
        `Missing geometry GEOIDs: ${missingGeometryGeoids.join(", ") || "none"}`,
      ].join("\n"),
    );
  }

  const outPath = path.join(process.cwd(), "public", "data", "blockGroups.geojson");
  fs.writeFileSync(outPath, `${JSON.stringify(geojson, null, 2)}\n`);

  console.log(`✓ Written to ${outPath}`);
  console.log(`  Block group geometries: ${geojson.features.length}`);
  console.log(`  GEOIDs matching ACS:    ${acsGeoids.size}`);
}

main().catch((error: unknown) => {
  console.error("fetchTigerGeometries failed:", error);
  process.exit(1);
});

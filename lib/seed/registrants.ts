import * as fs from "fs";
import * as path from "path";
import { booleanPointInPolygon, point } from "@turf/turf";
import { getDb } from "../db/client";
import { registrants } from "../db/schema";
import type { ContactStatus, Dependency } from "../db/schema";

export type SeedRegistrant = {
  id: string;
  fullName: string;
  age: number;
  address: string;
  lat: number;
  lon: number;
  blockGroup: string | null;
  dependencies: Dependency[];
  primaryLanguage: "en" | "es" | "hmn" | "so";
  contactPhone: string;
  caregiverPhone: string | null;
  registeredVia: "web";
  lastContactAt: null;
  contactStatus: ContactStatus;
};

type SeedRegistrantInput = Omit<SeedRegistrant, "blockGroup">;

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

type TurfPolygonInput = Parameters<typeof booleanPointInPolygon>[1];

const CREATED_AT = Date.UTC(2024, 8, 27, 12, 0, 0);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseBlockGroupGeoJson(value: unknown): BlockGroupFeatureCollection {
  if (!isRecord(value) || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error(
      "Missing block group geometries. Run `pnpm exec tsx scripts/fetchTigerGeometries.ts` first.",
    );
  }

  const features = value.features.map((feature, index): BlockGroupFeature => {
    if (!isRecord(feature) || feature.type !== "Feature") {
      throw new Error(`blockGroups.geojson features[${index}] is not a GeoJSON Feature`);
    }
    if (!isRecord(feature.properties)) {
      throw new Error(`blockGroups.geojson features[${index}] is missing properties`);
    }
    if (!isRecord(feature.geometry)) {
      throw new Error(`blockGroups.geojson features[${index}] is missing geometry`);
    }

    const geoid = getString(feature.properties.GEOID);
    if (geoid === null) {
      throw new Error(`blockGroups.geojson features[${index}] is missing properties.GEOID`);
    }

    const geometryType = feature.geometry.type;
    if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") {
      throw new Error(`blockGroups.geojson features[${index}] has unsupported geometry`);
    }

    return {
      type: "Feature",
      properties: {
        GEOID: geoid,
        NAMELSAD: getString(feature.properties.NAMELSAD),
      },
      geometry: feature.geometry as BlockGroupGeometry,
    };
  });

  return {
    type: "FeatureCollection",
    features,
  };
}

function loadBlockGroups(): BlockGroupFeature[] {
  const geojsonPath = path.join(process.cwd(), "public", "data", "blockGroups.geojson");
  const rawGeoJson = fs.readFileSync(geojsonPath, "utf8");
  return parseBlockGroupGeoJson(JSON.parse(rawGeoJson) as unknown).features;
}

const blockGroupFeatures = loadBlockGroups();

function findBlockGroup(lat: number, lon: number): string | null {
  const registrantPoint = point([lon, lat]);
  const match = blockGroupFeatures.find((feature) =>
    booleanPointInPolygon(registrantPoint, feature as TurfPolygonInput),
  );

  return match?.properties.GEOID ?? null;
}

// SYNTHETIC REGISTRANTS for demonstration purposes. Real names and phone numbers are not used.
const syntheticRegistrantInputs: SeedRegistrantInput[] = [
  {
    id: "synthetic-registrant-sarah-chen",
    fullName: "Sarah Chen",
    age: 72,
    address: "Riverside Drive & Lyman Street, Asheville, NC",
    lat: 35.589,
    lon: -82.5785,
    dependencies: ["oxygen", "lives_alone"],
    primaryLanguage: "en",
    contactPhone: "555-0101",
    caregiverPhone: "555-1101",
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-marcus-williams",
    fullName: "Marcus Williams",
    age: 68,
    address: "Riverside Drive & Craven Street, Asheville, NC",
    lat: 35.592,
    lon: -82.574,
    dependencies: ["mobility", "medication_critical"],
    primaryLanguage: "en",
    contactPhone: "555-0102",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-robert-kowalski",
    fullName: "Robert Kowalski",
    age: 81,
    address: "129 Roberts Street, Asheville, NC",
    lat: 35.5855,
    lon: -82.5677,
    dependencies: ["dialysis", "mobility"],
    primaryLanguage: "en",
    contactPhone: "555-0103",
    caregiverPhone: "555-1103",
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-elena-garcia",
    fullName: "Elena Garcia",
    age: 76,
    address: "US Highway 70 & Whitson Avenue, Swannanoa, NC",
    lat: 35.604,
    lon: -82.374,
    dependencies: ["limited_english", "medication_critical"],
    primaryLanguage: "es",
    contactPhone: "555-0104",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-asha-robinson",
    fullName: "Asha Robinson",
    age: 63,
    address: "1 Page Avenue, Asheville, NC",
    lat: 35.5954,
    lon: -82.5517,
    dependencies: ["blind_lv", "lives_alone"],
    primaryLanguage: "en",
    contactPhone: "555-0105",
    caregiverPhone: "555-1105",
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-yusuf-abdi",
    fullName: "Yusuf Abdi",
    age: 70,
    address: "Bee Tree Road near Warren Wilson Road, Swannanoa, NC",
    lat: 35.607,
    lon: -82.419,
    dependencies: ["cognitive", "limited_english"],
    primaryLanguage: "so",
    contactPhone: "555-0106",
    caregiverPhone: "555-1106",
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-linda-patel",
    fullName: "Linda Patel",
    age: 88,
    address: "Riceville Road near Old Farm School Road, Asheville, NC",
    lat: 35.6075,
    lon: -82.455,
    dependencies: ["deaf_hoh", "lives_alone"],
    primaryLanguage: "en",
    contactPhone: "555-0107",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-james-morales",
    fullName: "James Morales",
    age: 60,
    address: "91 Biltmore Avenue, Asheville, NC",
    lat: 35.5918,
    lon: -82.551,
    dependencies: ["child_at_home", "limited_english"],
    primaryLanguage: "es",
    contactPhone: "555-0108",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-evelyn-brooks",
    fullName: "Evelyn Brooks",
    age: 92,
    address: "Old US 70 Highway & Whitson Avenue, Swannanoa, NC",
    lat: 35.6045,
    lon: -82.381,
    dependencies: ["oxygen", "deaf_hoh", "medication_critical"],
    primaryLanguage: "en",
    contactPhone: "555-0109",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-thomas-nguyen",
    fullName: "Thomas Nguyen",
    age: 74,
    address: "Chunns Cove Road & Parkway Forest Drive, Asheville, NC",
    lat: 35.5765,
    lon: -82.489,
    dependencies: ["cognitive", "mobility"],
    primaryLanguage: "en",
    contactPhone: "555-0110",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-011-mae-holloway",
    fullName: "Mae Holloway",
    age: 84,
    address: "Meadow Road near Biltmore Village, Asheville, NC",
    lat: 35.5682,
    lon: -82.587,
    dependencies: ["lives_alone"],
    primaryLanguage: "en",
    contactPhone: "555-0111",
    caregiverPhone: "555-1111",
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-012-diego-santos",
    fullName: "Diego Santos",
    age: 52,
    address: "Onteora Boulevard & Fairview Road, Asheville, NC",
    lat: 35.579,
    lon: -82.514,
    dependencies: ["deaf_hoh"],
    primaryLanguage: "es",
    contactPhone: "555-0112",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-013-talia-reed",
    fullName: "Talia Reed",
    age: 34,
    address: "Chunns Cove Road near Parkway Forest Drive, Asheville, NC",
    lat: 35.579,
    lon: -82.4935,
    dependencies: ["cognitive"],
    primaryLanguage: "en",
    contactPhone: "555-0113",
    caregiverPhone: "555-1113",
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-014-hnub-vang",
    fullName: "Hnub Vang",
    age: 47,
    address: "Haywood Road & Vermont Avenue, Asheville, NC",
    lat: 35.578,
    lon: -82.5925,
    dependencies: ["limited_english"],
    primaryLanguage: "hmn",
    contactPhone: "555-0114",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
  {
    id: "synthetic-registrant-015-nora-bell",
    fullName: "Nora Bell",
    age: 29,
    address: "W.T. Weaver Boulevard & University Heights, Asheville, NC",
    lat: 35.616,
    lon: -82.567,
    dependencies: ["deaf_hoh"],
    primaryLanguage: "en",
    contactPhone: "555-0115",
    caregiverPhone: null,
    registeredVia: "web",
    lastContactAt: null,
    contactStatus: "unknown",
  },
];

export const syntheticRegistrants: SeedRegistrant[] = syntheticRegistrantInputs.map((registrant) => ({
  ...registrant,
  blockGroup: findBlockGroup(registrant.lat, registrant.lon),
}));

export function seedRegistrants(): void {
  const unmatchedRegistrants = syntheticRegistrants.filter(
    (registrant) => registrant.blockGroup === null,
  );

  for (const registrant of unmatchedRegistrants) {
    console.warn(
      `Warning: No Buncombe block group match for ${registrant.fullName} (${registrant.lat}, ${registrant.lon}); leaving null.`,
    );
  }

  getDb().delete(registrants).run();

  for (const registrant of syntheticRegistrants) {
    getDb()
      .insert(registrants)
      .values({
        id: registrant.id,
        fullName: registrant.fullName,
        age: registrant.age,
        address: registrant.address,
        lat: registrant.lat,
        lon: registrant.lon,
        blockGroup: registrant.blockGroup,
        dependencies: JSON.stringify(registrant.dependencies),
        primaryLanguage: registrant.primaryLanguage,
        contactPhone: registrant.contactPhone,
        caregiverPhone: registrant.caregiverPhone,
        registeredVia: registrant.registeredVia,
        createdAt: CREATED_AT,
        lastContactAt: registrant.lastContactAt,
        contactStatus: registrant.contactStatus,
        contactNotes: null,
      })
      .onConflictDoUpdate({
        target: registrants.id,
        set: {
          fullName: registrant.fullName,
          age: registrant.age,
          address: registrant.address,
          lat: registrant.lat,
          lon: registrant.lon,
          blockGroup: registrant.blockGroup,
          dependencies: JSON.stringify(registrant.dependencies),
          primaryLanguage: registrant.primaryLanguage,
          contactPhone: registrant.contactPhone,
          caregiverPhone: registrant.caregiverPhone,
          registeredVia: registrant.registeredVia,
          createdAt: CREATED_AT,
          lastContactAt: registrant.lastContactAt,
          contactStatus: registrant.contactStatus,
          contactNotes: null,
        },
      })
      .run();
  }

  console.log(`✓ registrants seeded (${syntheticRegistrants.length} synthetic)`);
}

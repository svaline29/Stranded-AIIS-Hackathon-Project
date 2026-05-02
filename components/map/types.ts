import type { ContactStatus, DamageSeverity, Dependency } from "@/lib/db/schema";

export type Position = [number, number];

export type Polygon = {
  type: "Polygon";
  coordinates: Position[][];
};

export type MultiPolygon = {
  type: "MultiPolygon";
  coordinates: Position[][][];
};

export type Point = {
  type: "Point";
  coordinates: Position;
};

export type Feature<Geometry, Properties> = {
  type: "Feature";
  id?: string | number;
  properties: Properties;
  geometry: Geometry;
};

export type FeatureCollection<Geometry, Properties> = {
  type: "FeatureCollection";
  features: Feature<Geometry, Properties>[];
};

export type DamageProperties = {
  id: string;
  severity: Exclude<DamageSeverity, "none">;
  source: string;
  detectedAt: number;
  notes: string | null;
};

export type DamageFeatureCollection = FeatureCollection<Polygon, DamageProperties>;

export type Registrant = {
  id: string;
  fullName: string;
  age: number | null;
  address: string;
  lat: number;
  lon: number;
  blockGroup: string | null;
  dependencies: Dependency[];
  primaryLanguage: string;
  contactPhone: string;
  caregiverPhone: string | null;
  registeredVia: "web" | "voice";
  createdAt: number;
  lastContactAt: number | null;
  contactStatus: ContactStatus;
  contactNotes: string | null;
};

export type RegistrantProperties = {
  id: string;
  contactStatus: ContactStatus;
  selected: boolean;
};

export type RegistrantFeatureCollection = FeatureCollection<Point, RegistrantProperties>;

export type BlockGroupProperties = {
  GEOID?: string;
  NAMELSAD?: string | null;
  geoid?: string;
  metricValue?: number | null;
  fillColor?: string;
};

export type BlockGroupGeometry = Polygon | MultiPolygon;
export type BlockGroupFeature = Feature<BlockGroupGeometry, BlockGroupProperties>;
export type BlockGroupFeatureCollection = FeatureCollection<
  BlockGroupGeometry,
  BlockGroupProperties
>;

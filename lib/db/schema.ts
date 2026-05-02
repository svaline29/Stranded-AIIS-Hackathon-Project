import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const registrants = sqliteTable("registrants", {
  id: text("id").primaryKey(), // UUID
  fullName: text("full_name").notNull(),
  age: integer("age"),
  address: text("address").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  blockGroup: text("block_group"),
  dependencies: text("dependencies").notNull().default("[]"), // JSON array of Dependency
  primaryLanguage: text("primary_language").notNull().default("en"),
  contactPhone: text("contact_phone").notNull(),
  caregiverPhone: text("caregiver_phone"),
  registeredVia: text("registered_via", { enum: ["web", "voice"] })
    .notNull()
    .default("web"),
  createdAt: integer("created_at").notNull(), // epoch ms

  // Runtime state — mutated during disaster mode
  lastContactAt: integer("last_contact_at"),
  contactStatus: text("contact_status", {
    enum: ["unknown", "safe", "needs_help", "no_response", "confused"],
  })
    .notNull()
    .default("unknown"),
  contactNotes: text("contact_notes"),
});

export const damagePolygons = sqliteTable("damage_polygons", {
  id: text("id").primaryKey(),
  geometry: text("geometry").notNull(), // GeoJSON Polygon string
  severity: text("severity", {
    enum: ["none", "minor", "major", "destroyed"],
  }).notNull(),
  source: text("source", {
    enum: ["manual", "vision_llm", "external"],
  }).notNull(),
  detectedAt: integer("detected_at").notNull(), // epoch ms
  notes: text("notes"),
});

export const disasterState = sqliteTable("disaster_state", {
  id: integer("id").primaryKey(), // always 1
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  activatedAt: integer("activated_at"),
  scenarioName: text("scenario_name").notNull(),
  bboxGeoJSON: text("bbox_geojson").notNull(),
});

export const dispatchBriefings = sqliteTable("dispatch_briefings", {
  id: text("id").primaryKey(),
  registrantId: text("registrant_id")
    .notNull()
    .references(() => registrants.id),
  riskScore: real("risk_score").notNull(),
  briefing: text("briefing").notNull(), // natural language
  accessNotes: text("access_notes"),
  priorityAction: text("priority_action").notNull().default(""),
  priorityTier: text("priority_tier", { enum: ["P1", "P2", "P3", "P4"] })
    .notNull()
    .default("P4"),
  primaryConcern: text("primary_concern").notNull().default(""),
  immediateRisks: text("immediate_risks").notNull().default("[]"), // JSON array
  timeSensitivity: text("time_sensitivity", {
    enum: ["hours", "days", "weeks", "none"],
  })
    .notNull()
    .default("none"),
  confidence: real("confidence").notNull().default(0),
  resourceTags: text("resource_tags").notNull().default("[]"), // JSON array
  generatedAt: integer("generated_at").notNull(),
});

export const contactAttempts = sqliteTable("contact_attempts", {
  id: text("id").primaryKey(),
  registrantId: text("registrant_id")
    .notNull()
    .references(() => registrants.id),
  channel: text("channel", { enum: ["voice", "sms"] }).notNull(),
  attemptedAt: integer("attempted_at").notNull(),
  outcome: text("outcome", {
    enum: ["safe", "needs_help", "no_answer", "voicemail", "error"],
  }).notNull(),
  transcript: text("transcript"),
});

// Controlled vocabulary for dependency types
export type Dependency =
  | "oxygen"
  | "dialysis"
  | "mobility"
  | "deaf_hoh"
  | "blind_lv"
  | "cognitive"
  | "lives_alone"
  | "child_at_home"
  | "limited_english"
  | "medication_critical";

export type ContactStatus =
  | "unknown"
  | "safe"
  | "needs_help"
  | "no_response"
  | "confused";

export type DamageSeverity = "none" | "minor" | "major" | "destroyed";

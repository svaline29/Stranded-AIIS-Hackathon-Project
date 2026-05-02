CREATE TABLE `contact_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`registrant_id` text NOT NULL,
	`channel` text NOT NULL,
	`attempted_at` integer NOT NULL,
	`outcome` text NOT NULL,
	`transcript` text,
	FOREIGN KEY (`registrant_id`) REFERENCES `registrants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `damage_polygons` (
	`id` text PRIMARY KEY NOT NULL,
	`geometry` text NOT NULL,
	`severity` text NOT NULL,
	`source` text NOT NULL,
	`detected_at` integer NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `disaster_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`activated_at` integer,
	`scenario_name` text NOT NULL,
	`bbox_geojson` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dispatch_briefings` (
	`id` text PRIMARY KEY NOT NULL,
	`registrant_id` text NOT NULL,
	`risk_score` real NOT NULL,
	`briefing` text NOT NULL,
	`resource_tags` text DEFAULT '[]' NOT NULL,
	`generated_at` integer NOT NULL,
	FOREIGN KEY (`registrant_id`) REFERENCES `registrants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `registrants` (
	`id` text PRIMARY KEY NOT NULL,
	`full_name` text NOT NULL,
	`age` integer,
	`address` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`block_group` text,
	`dependencies` text DEFAULT '[]' NOT NULL,
	`primary_language` text DEFAULT 'en' NOT NULL,
	`contact_phone` text NOT NULL,
	`caregiver_phone` text,
	`registered_via` text DEFAULT 'web' NOT NULL,
	`created_at` integer NOT NULL,
	`last_contact_at` integer,
	`contact_status` text DEFAULT 'unknown' NOT NULL,
	`contact_notes` text
);

ALTER TABLE `dispatch_briefings` ADD `access_notes` text;--> statement-breakpoint
ALTER TABLE `dispatch_briefings` ADD `priority_action` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `dispatch_briefings` ADD `priority_tier` text DEFAULT 'P4' NOT NULL;--> statement-breakpoint
ALTER TABLE `dispatch_briefings` ADD `primary_concern` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `dispatch_briefings` ADD `immediate_risks` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `dispatch_briefings` ADD `time_sensitivity` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `dispatch_briefings` ADD `confidence` real DEFAULT 0 NOT NULL;
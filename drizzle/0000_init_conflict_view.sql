CREATE TABLE IF NOT EXISTS `firms_fires` (
	`id` text PRIMARY KEY NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`frp` real,
	`brightness` real,
	`confidence` text,
	`acq_date` text,
	`acq_time` text,
	`satellite` text,
	`daynight` text,
	`source` text DEFAULT 'VIIRS_SNPP_NRT' NOT NULL,
	`theater` text,
	`ingested_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_firms_ingested` ON `firms_fires` (`ingested_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_firms_theater` ON `firms_fires` (`theater`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_firms_geo` ON `firms_fires` (`lat`,`lng`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gdelt_points` (
	`id` text PRIMARY KEY NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`name` text,
	`url` text,
	`mention_count` integer,
	`share_image` text,
	`query_tag` text,
	`ingested_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_gdelt_ingested` ON `gdelt_points` (`ingested_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_gdelt_tag` ON `gdelt_points` (`query_tag`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_gdelt_geo` ON `gdelt_points` (`lat`,`lng`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ingest_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`firms_count` integer DEFAULT 0,
	`gdelt_count` integer DEFAULT 0,
	`ok` integer DEFAULT 0 NOT NULL,
	`error` text,
	`detail_json` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ukraine_control_builds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`control_date` text NOT NULL,
	`lod_tier` text NOT NULL,
	`path_count` integer DEFAULT 0 NOT NULL,
	`zone_count` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'viina-build',
	`built_at` text DEFAULT (datetime('now')) NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ua_builds_date_lod` ON `ukraine_control_builds` (`control_date`,`lod_tier`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ukraine_control_paths` (
	`id` text PRIMARY KEY NOT NULL,
	`zone_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text,
	`accent_color` text,
	`lod_tier` text NOT NULL,
	`control_date` text NOT NULL,
	`points_json` text NOT NULL,
	`point_count` integer DEFAULT 0 NOT NULL,
	`min_lat` real,
	`min_lng` real,
	`max_lat` real,
	`max_lng` real,
	`built_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ua_paths_zone` ON `ukraine_control_paths` (`zone_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ua_paths_kind` ON `ukraine_control_paths` (`kind`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ua_paths_lod_date` ON `ukraine_control_paths` (`lod_tier`,`control_date`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ua_paths_geo` ON `ukraine_control_paths` (`min_lat`,`max_lat`,`min_lng`,`max_lng`);

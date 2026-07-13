CREATE TABLE IF NOT EXISTS `news_stream_snapshots` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`packages` text,
	`lang` text DEFAULT 'ko' NOT NULL,
	`payload_json` text NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`tier1_count` integer DEFAULT 0 NOT NULL,
	`tier2_count` integer DEFAULT 0 NOT NULL,
	`tier3_count` integer DEFAULT 0 NOT NULL,
	`fetched_at` text NOT NULL,
	`ingested_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_news_snap_fetched` ON `news_stream_snapshots` (`fetched_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_news_snap_lang` ON `news_stream_snapshots` (`lang`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `news_stream_items` (
	`id` text PRIMARY KEY NOT NULL,
	`cache_key` text NOT NULL,
	`item_id` text NOT NULL,
	`trust_tier` integer NOT NULL,
	`theater` text,
	`title` text NOT NULL,
	`link` text NOT NULL,
	`source` text,
	`publisher` text,
	`pub_date` text,
	`feed_topic` text,
	`econ_genre` text,
	`category` text,
	`image_url` text,
	`summary` text,
	`role` text DEFAULT 'verified' NOT NULL,
	`ingested_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_news_items_cache` ON `news_stream_items` (`cache_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_news_items_tier` ON `news_stream_items` (`trust_tier`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_news_items_theater` ON `news_stream_items` (`theater`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_news_items_ingested` ON `news_stream_items` (`ingested_at`);

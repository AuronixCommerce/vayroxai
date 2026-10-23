CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hash` text NOT NULL,
	`preview` text NOT NULL,
	`models` text NOT NULL,
	`origins` text NOT NULL,
	`rpm` integer NOT NULL,
	`daily_limit` integer NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL,
	`last_used` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_api_keys_hash_unique` ON `project_api_keys` (`hash`);--> statement-breakpoint
CREATE TABLE `request_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`key_id` text,
	`model` text NOT NULL,
	`status` integer NOT NULL,
	`tokens` integer DEFAULT 0 NOT NULL,
	`duration` integer NOT NULL,
	`created` integer NOT NULL
);

CREATE TABLE `usage_windows` (
	`id` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `model` text DEFAULT 'swift' NOT NULL;
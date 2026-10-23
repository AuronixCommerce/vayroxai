CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`mode` text DEFAULT 'General' NOT NULL,
	`messages` text DEFAULT '[]' NOT NULL,
	`updated` integer NOT NULL
);

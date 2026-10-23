CREATE TABLE `guest_allowances` (
	`id` text PRIMARY KEY NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL
);

CREATE TABLE `providers` (
	`owner` text PRIMARY KEY NOT NULL,
	`encrypted_key` text NOT NULL,
	`model` text NOT NULL
);

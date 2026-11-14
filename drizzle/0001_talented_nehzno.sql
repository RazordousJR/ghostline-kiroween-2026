CREATE TABLE `entry_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL,
	`hits` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entry_limit_expiry` ON `entry_limits` (`expires`);
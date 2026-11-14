CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`room` text NOT NULL,
	`name` text NOT NULL,
	`seen` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_room` ON `members` (`room`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`speaker` text,
	`lease` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`room`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `signal_recipient` ON `signals` (`recipient`,`id`);
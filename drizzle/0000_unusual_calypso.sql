CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_tasks_session_expiry` ON `practice_tasks` (`session_id`,`expires_at`);
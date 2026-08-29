CREATE TABLE `guardian_profile_update_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardian_profile_update_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `guardian_profile_update_events` ADD CONSTRAINT `guardian_profile_update_events_guardianUserId_users_id_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `guardian_profile_update_events_guardian_created_idx` ON `guardian_profile_update_events` (`guardianUserId`,`createdAt`);
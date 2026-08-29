CREATE TABLE `guardian_contact_access_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianUserId` int NOT NULL,
	`adminUserId` int NOT NULL,
	`tutorRequestId` int NOT NULL,
	`context` enum('guardian_request') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardian_contact_access_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tutor_profile_moderation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`adminUserId` int NOT NULL,
	`previousStatus` enum('draft','pending','changes_requested','approved','suspended') NOT NULL,
	`nextStatus` enum('draft','pending','changes_requested','approved','suspended') NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_profile_moderation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `guardian_contact_access_events` ADD CONSTRAINT `guardian_contact_access_events_guardianUserId_users_id_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_contact_access_events` ADD CONSTRAINT `guardian_contact_access_events_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_contact_access_events` ADD CONSTRAINT `guardian_contact_access_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_profile_moderation_events` ADD CONSTRAINT `tutor_profile_moderation_events_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_profile_moderation_events` ADD CONSTRAINT `tutor_profile_moderation_events_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `guardian_contact_access_events_guardian_created_idx` ON `guardian_contact_access_events` (`guardianUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `guardian_contact_access_events_admin_created_idx` ON `guardian_contact_access_events` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `guardian_contact_access_events_request_created_idx` ON `guardian_contact_access_events` (`tutorRequestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tutor_profile_moderation_events_tutor_created_idx` ON `tutor_profile_moderation_events` (`tutorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tutor_profile_moderation_events_admin_created_idx` ON `tutor_profile_moderation_events` (`adminUserId`,`createdAt`);

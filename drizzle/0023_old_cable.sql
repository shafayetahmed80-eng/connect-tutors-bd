CREATE TABLE `guardian_profile_photo_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianUserId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('submitted','replaced','removed','approved','rejected') NOT NULL,
	`previousStatus` enum('pending_review','approved','rejected'),
	`nextStatus` enum('pending_review','approved','rejected'),
	`rejectionReason` enum('not_clear_guardian_portrait','contains_child_or_sensitive_personal_data','contains_contact_or_promotional_content','inappropriate_or_unsafe_content','low_quality_or_unrelated_image'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardian_profile_photo_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guardian_profile_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianUserId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`status` enum('pending_review','approved','rejected') NOT NULL DEFAULT 'pending_review',
	`rejectionReason` enum('not_clear_guardian_portrait','contains_child_or_sensitive_personal_data','contains_contact_or_promotional_content','inappropriate_or_unsafe_content','low_quality_or_unrelated_image'),
	`moderationNote` varchar(280),
	`moderatedByAdminId` int,
	`moderatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardian_profile_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_profile_photos_guardian_unique` UNIQUE(`guardianUserId`)
);
--> statement-breakpoint
ALTER TABLE `guardian_profile_photo_events` ADD CONSTRAINT `guardian_profile_photo_events_guardianUserId_users_id_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_profile_photo_events` ADD CONSTRAINT `guardian_profile_photo_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_profile_photos` ADD CONSTRAINT `guardian_profile_photos_guardianUserId_users_id_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_profile_photos` ADD CONSTRAINT `guardian_profile_photos_moderatedByAdminId_users_id_fk` FOREIGN KEY (`moderatedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `guardian_photo_events_guardian_created_idx` ON `guardian_profile_photo_events` (`guardianUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `guardian_photo_events_actor_created_idx` ON `guardian_profile_photo_events` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `guardian_profile_photos_status_updated_idx` ON `guardian_profile_photos` (`status`,`updatedAt`);
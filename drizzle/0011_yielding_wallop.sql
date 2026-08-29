CREATE TABLE `guardian_phone_intakes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(16) NOT NULL,
	`status` enum('pending','completed','expired') NOT NULL DEFAULT 'pending',
	`handoffTokenHash` varchar(128) NOT NULL,
	`handoffExpiresAt` timestamp NOT NULL,
	`phoneVerifiedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardian_phone_intakes_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_phone_intakes_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE INDEX `guardian_phone_intakes_status_expiry_idx` ON `guardian_phone_intakes` (`status`,`handoffExpiresAt`);
CREATE TABLE `guardian_profiles` (
	`userId` int NOT NULL,
	`phone` varchar(16) NOT NULL,
	`gender` enum('male','female') NOT NULL,
	`cityLocationId` varchar(80) NOT NULL,
	`locationId` varchar(80) NOT NULL,
	`termsVersion` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guardian_profiles_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `guardian_profiles_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
ALTER TABLE `guardian_profiles` ADD CONSTRAINT `guardian_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_profiles` ADD CONSTRAINT `guardian_profiles_cityLocationId_locations_id_fk` FOREIGN KEY (`cityLocationId`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_profiles` ADD CONSTRAINT `guardian_profiles_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `guardian_profiles_location_idx` ON `guardian_profiles` (`cityLocationId`,`locationId`);
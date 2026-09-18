CREATE TABLE `admin_profiles` (
  `userId` int NOT NULL,
  `phone` varchar(16),
  `additionalPhone` varchar(16),
  `gender` enum('male','female'),
  `religion` varchar(40),
  `nationality` varchar(60),
  `cityLocationId` varchar(80),
  `locationId` varchar(80),
  `addressDetails` varchar(255),
  `designation` varchar(120),
  `photoKey` varchar(512),
  `nidFrontKey` varchar(512),
  `nidBackKey` varchar(512),
  `emergencyContactName` varchar(120),
  `emergencyContactPhone` varchar(16),
  `emergencyContactRelation` varchar(60),
  `emergencyContactAddress` varchar(255),
  `emergencyContactProfession` varchar(120),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `admin_profiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `admin_profiles` ADD CONSTRAINT `admin_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `admin_profiles` ADD CONSTRAINT `admin_profiles_cityLocationId_locations_id_fk` FOREIGN KEY (`cityLocationId`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `admin_profiles` ADD CONSTRAINT `admin_profiles_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;

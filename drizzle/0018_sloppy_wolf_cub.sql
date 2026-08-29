CREATE TABLE `tutor_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`publicJobId` varchar(32) NOT NULL,
	`publicationStatus` enum('published','unpublished','closed') NOT NULL DEFAULT 'published',
	`tuitionType` enum('home','online','both') NOT NULL,
	`category` varchar(120) NOT NULL,
	`classCourse` varchar(120) NOT NULL,
	`subjects` text NOT NULL,
	`studentCount` int NOT NULL DEFAULT 1,
	`studentGender` enum('male','female','any'),
	`preferredTutorGender` enum('male','female','any') NOT NULL DEFAULT 'any',
	`daysPerWeek` int NOT NULL,
	`budgetMode` enum('range','discuss') NOT NULL,
	`budgetMinimum` int,
	`budgetMaximum` int,
	`country` varchar(120) NOT NULL DEFAULT 'Bangladesh',
	`cityLocationId` varchar(80),
	`locationId` varchar(80),
	`locationLabel` varchar(240),
	`directionLabel` varchar(240),
	`publishedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`deactivatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutor_jobs_tutorRequestId_unique` UNIQUE(`tutorRequestId`),
	CONSTRAINT `tutor_jobs_publicJobId_unique` UNIQUE(`publicJobId`)
);
--> statement-breakpoint
ALTER TABLE `tutor_jobs` ADD CONSTRAINT `tutor_jobs_tutorRequestId_tutor_requests_id_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_jobs_publication_expiry_idx` ON `tutor_jobs` (`publicationStatus`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `tutor_jobs_city_expiry_idx` ON `tutor_jobs` (`cityLocationId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `tutor_jobs_location_expiry_idx` ON `tutor_jobs` (`locationId`,`expiresAt`);
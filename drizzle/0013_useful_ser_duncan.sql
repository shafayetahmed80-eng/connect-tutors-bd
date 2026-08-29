ALTER TABLE `tutor_requests` ADD `studentFirstName` varchar(80);--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `tuitionCityLocationId` varchar(80);--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `tuitionLocationId` varchar(80);--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `tuitionLocationLabel` varchar(240);--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `budgetMode` enum('range','discuss');--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `budgetMinimum` int;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `budgetMaximum` int;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `contactConsent` enum('not_required','pending','approved','declined') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD CONSTRAINT `tutor_requests_tuitionCityLocationId_locations_id_fk` FOREIGN KEY (`tuitionCityLocationId`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD CONSTRAINT `tutor_requests_tuitionLocationId_locations_id_fk` FOREIGN KEY (`tuitionLocationId`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_requests_guardian_created_idx` ON `tutor_requests` (`guardianUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tutor_requests_status_consent_idx` ON `tutor_requests` (`status`,`contactConsent`);
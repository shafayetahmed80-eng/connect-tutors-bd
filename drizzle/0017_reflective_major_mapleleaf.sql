CREATE TABLE `tutor_request_publication_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`adminUserId` int NOT NULL,
	`action` enum('verify','edit','guardian_confirmed','request_changes','approve','publish','unpublish','close') NOT NULL,
	`previousState` enum('submitted','reviewing','changes_requested','approved','unpublished','published','closed') NOT NULL,
	`nextState` enum('submitted','reviewing','changes_requested','approved','unpublished','published','closed') NOT NULL,
	`reason` varchar(1000),
	`beforeSnapshot` text,
	`afterSnapshot` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_request_publication_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `publicationState` enum('submitted','reviewing','changes_requested','approved','unpublished','published','closed') DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `guardianConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tutor_request_publication_events` ADD CONSTRAINT `trpe_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_request_publication_events` ADD CONSTRAINT `trpe_admin_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `trpe_request_created_idx` ON `tutor_request_publication_events` (`tutorRequestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `trpe_admin_created_idx` ON `tutor_request_publication_events` (`adminUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tutor_requests_publication_state_idx` ON `tutor_requests` (`publicationState`,`createdAt`);

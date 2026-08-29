CREATE TABLE `confirmation_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`guardianUserId` int NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`createdByAdminUserId` int NOT NULL,
	`issuedByAdminUserId` int,
	`status` enum('draft','issued','superseded') NOT NULL DEFAULT 'draft',
	`letterNumber` varchar(48) NOT NULL,
	`version` int NOT NULL,
	`agreedStartDate` date,
	`agreedFeeMinimum` int,
	`agreedFeeMaximum` int,
	`contentSnapshot` text NOT NULL,
	`revisionReason` varchar(280),
	`pdfStorageKey` varchar(500),
	`reviewedAt` timestamp,
	`issuedAt` timestamp,
	`supersededAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `confirmation_letters_id` PRIMARY KEY(`id`),
	CONSTRAINT `confirmation_letters_number_unique` UNIQUE(`letterNumber`),
	CONSTRAINT `confirmation_letters_request_version_unique` UNIQUE(`tutorRequestId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `guardian_request_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianUserId` int NOT NULL,
	`tutorRequestId` int NOT NULL,
	`type` enum('lifecycle','follow_up','confirmation_letter_issued') NOT NULL,
	`followUpKind` enum('availability_confirmation','information_required','meeting_update'),
	`title` varchar(120) NOT NULL,
	`message` varchar(360) NOT NULL,
	`actionPath` varchar(240) NOT NULL,
	`deduplicationKey` varchar(160) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guardian_request_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `guardian_request_notifications_dedup_unique` UNIQUE(`deduplicationKey`)
);
--> statement-breakpoint
CREATE TABLE `tutor_request_assignment_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`adminUserId` int NOT NULL,
	`category` enum('matching','guardian_contact','tutor_follow_up','internal_risk') NOT NULL,
	`body` varchar(1000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_request_assignment_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `confirmation_letters` ADD CONSTRAINT `cl_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `confirmation_letters` ADD CONSTRAINT `cl_guardian_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `confirmation_letters` ADD CONSTRAINT `cl_tutor_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `confirmation_letters` ADD CONSTRAINT `cl_created_admin_fk` FOREIGN KEY (`createdByAdminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `confirmation_letters` ADD CONSTRAINT `cl_issued_admin_fk` FOREIGN KEY (`issuedByAdminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_request_notifications` ADD CONSTRAINT `grn_guardian_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guardian_request_notifications` ADD CONSTRAINT `grn_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_request_assignment_notes` ADD CONSTRAINT `tran_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_request_assignment_notes` ADD CONSTRAINT `tran_admin_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `confirmation_letters_guardian_issued_idx` ON `confirmation_letters` (`guardianUserId`,`issuedAt`);--> statement-breakpoint
CREATE INDEX `confirmation_letters_tutor_issued_idx` ON `confirmation_letters` (`tutorId`,`issuedAt`);--> statement-breakpoint
CREATE INDEX `guardian_request_notifications_guardian_created_idx` ON `guardian_request_notifications` (`guardianUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `guardian_request_notifications_guardian_read_idx` ON `guardian_request_notifications` (`guardianUserId`,`readAt`);--> statement-breakpoint
CREATE INDEX `tutor_request_assignment_notes_request_created_idx` ON `tutor_request_assignment_notes` (`tutorRequestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tutor_request_assignment_notes_admin_created_idx` ON `tutor_request_assignment_notes` (`adminUserId`,`createdAt`);
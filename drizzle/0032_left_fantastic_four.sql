CREATE TABLE `tutor_confirmation_letter_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`confirmationLetterId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` varchar(500) NOT NULL,
	`actionPath` varchar(500) NOT NULL,
	`deduplicationKey` varchar(180) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_confirmation_letter_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutor_cl_notice_dedupe_unique` UNIQUE(`deduplicationKey`)
);
--> statement-breakpoint
ALTER TABLE `tutor_confirmation_letter_notifications` ADD CONSTRAINT `tcln_tutor_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_confirmation_letter_notifications` ADD CONSTRAINT `tcln_letter_fk` FOREIGN KEY (`confirmationLetterId`) REFERENCES `confirmation_letters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_cl_notice_tutor_created_idx` ON `tutor_confirmation_letter_notifications` (`tutorId`,`createdAt`);
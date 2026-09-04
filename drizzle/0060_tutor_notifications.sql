CREATE TABLE `tutor_notifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tutorId` varchar(32) NOT NULL,
  `type` enum('profile_moderation','interest_decision','appointment','confirmation_letter') NOT NULL,
  `title` varchar(120) NOT NULL,
  `message` varchar(360) NOT NULL,
  `actionPath` varchar(240) NOT NULL,
  `deduplicationKey` varchar(160) NOT NULL,
  `readAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `tutor_notifications_id` PRIMARY KEY(`id`),
  CONSTRAINT `tutor_notifications_dedup_unique` UNIQUE(`deduplicationKey`)
);
--> statement-breakpoint
ALTER TABLE `tutor_notifications` ADD CONSTRAINT `tn_tutor_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tutor_notifications_tutor_created_idx` ON `tutor_notifications` (`tutorId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `tutor_notifications_tutor_read_idx` ON `tutor_notifications` (`tutorId`,`readAt`);

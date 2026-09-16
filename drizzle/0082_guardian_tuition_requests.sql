CREATE TABLE `guardian_tuition_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `tutorRequestId` int NOT NULL,
  `guardianUserId` int NOT NULL,
  `type` enum('confirm','remove_tutor','cancel_tuition') NOT NULL,
  `tutorId` varchar(32),
  `reason` varchar(280),
  `status` enum('pending','approved','declined','withdrawn','closed') NOT NULL DEFAULT 'pending',
  `decidedByAdminId` int,
  `decidedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `guardian_tuition_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `guardian_tuition_requests` ADD CONSTRAINT `gtr_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `guardian_tuition_requests` ADD CONSTRAINT `gtr_guardian_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `guardian_tuition_requests_request_status_idx` ON `guardian_tuition_requests` (`tutorRequestId`,`status`);

CREATE TABLE `tutor_job_interests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorJobId` int NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`status` enum('interested','shortlisted','declined','matched','withdrawn') NOT NULL DEFAULT 'interested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_job_interests_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutor_job_interests_job_tutor_unique` UNIQUE(`tutorJobId`,`tutorId`)
);
--> statement-breakpoint
ALTER TABLE `tutor_job_interests` ADD CONSTRAINT `tutor_job_interests_tutorJobId_tutor_jobs_id_fk` FOREIGN KEY (`tutorJobId`) REFERENCES `tutor_jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_job_interests` ADD CONSTRAINT `tutor_job_interests_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_job_interests_job_status_idx` ON `tutor_job_interests` (`tutorJobId`,`status`);--> statement-breakpoint
CREATE INDEX `tutor_job_interests_tutor_status_idx` ON `tutor_job_interests` (`tutorId`,`status`);
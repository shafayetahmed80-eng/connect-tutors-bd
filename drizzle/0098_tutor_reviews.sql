CREATE TABLE `tutor_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`guardianUserId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutor_reviews_request_unique` UNIQUE(`tutorRequestId`)
);
--> statement-breakpoint
ALTER TABLE `tutor_reviews` ADD CONSTRAINT `tutor_reviews_tutorRequestId_tutor_requests_id_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_reviews` ADD CONSTRAINT `tutor_reviews_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_reviews` ADD CONSTRAINT `tutor_reviews_guardianUserId_users_id_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_reviews_tutor_idx` ON `tutor_reviews` (`tutorId`);

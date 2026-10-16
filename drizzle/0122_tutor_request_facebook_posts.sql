CREATE TABLE `tutor_request_facebook_posts` (
	`requestId` int NOT NULL,
	`postedAt` timestamp NOT NULL DEFAULT (now()),
	`postedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_request_facebook_posts_requestId` PRIMARY KEY(`requestId`)
);
--> statement-breakpoint
ALTER TABLE `tutor_request_facebook_posts` ADD CONSTRAINT `trfp_request_fk` FOREIGN KEY (`requestId`) REFERENCES `tutor_requests`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tutor_request_facebook_posts` ADD CONSTRAINT `trfp_posted_by_fk` FOREIGN KEY (`postedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `trfp_posted_at_idx` ON `tutor_request_facebook_posts` (`postedAt`);

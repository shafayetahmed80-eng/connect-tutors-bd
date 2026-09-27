ALTER TABLE `tutor_admin_chat_threads` ADD `archivedAt` timestamp;
--> statement-breakpoint
CREATE TABLE `tutor_admin_chat_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`authorAdminId` int NOT NULL,
	`body` varchar(2000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_admin_chat_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_quick_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(60) NOT NULL,
	`body` varchar(2000) NOT NULL,
	`createdByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_quick_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_notes` ADD CONSTRAINT `tacn_tutor_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_notes` ADD CONSTRAINT `tacn_author_fk` FOREIGN KEY (`authorAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `chat_quick_replies` ADD CONSTRAINT `cqr_created_by_fk` FOREIGN KEY (`createdByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `admin_push_subscriptions` ADD CONSTRAINT `aps_admin_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tutor_admin_chat_notes_tutor_created_idx` ON `tutor_admin_chat_notes` (`tutorId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `admin_push_subscriptions_admin_idx` ON `admin_push_subscriptions` (`adminId`);

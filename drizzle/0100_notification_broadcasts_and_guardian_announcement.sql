ALTER TABLE `guardian_request_notifications` MODIFY COLUMN `type` enum('lifecycle','follow_up','confirmation_letter_issued','verification','account_change','announcement') NOT NULL;
--> statement-breakpoint
CREATE TABLE `admin_notification_broadcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`audience` enum('tutor','guardian') NOT NULL,
	`title` varchar(120) NOT NULL,
	`message` varchar(360) NOT NULL,
	`recipientCount` int NOT NULL,
	`sentByAdminId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_notification_broadcasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_notification_broadcasts` ADD CONSTRAINT `anb_admin_fk` FOREIGN KEY (`sentByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `admin_notification_broadcasts_audience_created_idx` ON `admin_notification_broadcasts` (`audience`,`createdAt`);

CREATE TABLE IF NOT EXISTS `admin_message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('tutor_chat','tutor_notify','guardian_notify') NOT NULL,
	`title` varchar(120) NOT NULL,
	`body` varchar(2000) NOT NULL,
	`createdByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_message_templates_id` PRIMARY KEY(`id`),
	KEY `admin_message_templates_category_idx` (`category`,`createdAt`)
);
--> statement-breakpoint
ALTER TABLE `admin_message_templates` ADD `command` varchar(40);
--> statement-breakpoint
CREATE INDEX `admin_message_templates_command_idx` ON `admin_message_templates` (`command`);
--> statement-breakpoint
ALTER TABLE `admin_message_templates` ADD CONSTRAINT `amt_created_by_fk` FOREIGN KEY (`createdByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

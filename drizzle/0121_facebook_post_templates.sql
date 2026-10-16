CREATE TABLE `facebook_post_templates` (
	`id` varchar(32) NOT NULL,
	`bulkHeader` text,
	`bulkFooter` text,
	`singleHeader` text,
	`singleFooter` text,
	`updatedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facebook_post_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `facebook_post_templates` ADD CONSTRAINT `fpt_updated_by_fk` FOREIGN KEY (`updatedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

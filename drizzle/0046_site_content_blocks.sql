CREATE TABLE `site_content_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anchorId` varchar(120) NOT NULL,
	`page` varchar(60) NOT NULL,
	`heading` varchar(120),
	`body` text,
	`tone` varchar(20) NOT NULL DEFAULT 'info',
	`sortOrder` int NOT NULL DEFAULT 0,
	`active` int NOT NULL DEFAULT 1,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_content_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `site_content_blocks` ADD CONSTRAINT `site_content_blocks_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `site_content_blocks_anchor_sort_idx` ON `site_content_blocks` (`anchorId`,`active`,`sortOrder`);
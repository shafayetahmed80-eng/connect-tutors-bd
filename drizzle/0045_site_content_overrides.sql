CREATE TABLE `site_content_overrides` (
	`slotId` varchar(120) NOT NULL,
	`page` varchar(60) NOT NULL,
	`text` varchar(240),
	`textSize` varchar(20),
	`spacing` varchar(20),
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_content_overrides_slotId` PRIMARY KEY(`slotId`)
);
--> statement-breakpoint
ALTER TABLE `site_content_overrides` ADD CONSTRAINT `site_content_overrides_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `site_content_overrides_page_idx` ON `site_content_overrides` (`page`);
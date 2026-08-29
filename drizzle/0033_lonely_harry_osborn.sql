CREATE TABLE `admin_matching_saved_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`filters` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_matching_saved_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_matching_saved_views_owner_name_unique` UNIQUE(`adminUserId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `admin_matching_saved_views` ADD CONSTRAINT `amsv_admin_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_matching_saved_views_owner_updated_idx` ON `admin_matching_saved_views` (`adminUserId`,`updatedAt`);
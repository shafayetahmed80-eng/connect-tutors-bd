CREATE TABLE `admin_matching_default_saved_views` (
	`adminUserId` int NOT NULL,
	`savedViewId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_matching_default_saved_views_adminUserId` PRIMARY KEY(`adminUserId`),
	CONSTRAINT `amdsv_saved_view_unique` UNIQUE(`savedViewId`)
);
--> statement-breakpoint
ALTER TABLE `admin_matching_default_saved_views` ADD CONSTRAINT `amdsv_admin_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_matching_default_saved_views` ADD CONSTRAINT `amdsv_view_fk` FOREIGN KEY (`savedViewId`) REFERENCES `admin_matching_saved_views`(`id`) ON DELETE no action ON UPDATE no action;
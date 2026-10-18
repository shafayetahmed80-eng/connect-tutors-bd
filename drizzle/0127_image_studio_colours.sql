CREATE TABLE `image_studio_colours` (
	`id` varchar(64) NOT NULL,
	`name` varchar(40) NOT NULL,
	`ground` varchar(7) NOT NULL,
	`text` varchar(7) NOT NULL,
	`accent` varchar(7) NOT NULL,
	`createdByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `image_studio_colours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `image_studio_colours` ADD CONSTRAINT `isc_created_by_fk` FOREIGN KEY (`createdByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

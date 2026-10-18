CREATE TABLE `image_studio_marks` (
	`kind` varchar(16) NOT NULL,
	`itemId` varchar(64) NOT NULL,
	`starred` boolean NOT NULL DEFAULT false,
	`archived` boolean NOT NULL DEFAULT false,
	`updatedByAdminId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `image_studio_marks_pk` PRIMARY KEY(`kind`,`itemId`)
);
--> statement-breakpoint
ALTER TABLE `image_studio_marks` ADD CONSTRAINT `ism_updated_by_fk` FOREIGN KEY (`updatedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

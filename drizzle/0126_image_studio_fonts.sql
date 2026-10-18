CREATE TABLE `image_studio_fonts` (
	`id` varchar(64) NOT NULL,
	`name` varchar(80) NOT NULL,
	`script` varchar(2) NOT NULL,
	`category` varchar(16) NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`format` varchar(8) NOT NULL,
	`sizeBytes` int NOT NULL,
	`uploadedByAdminId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `image_studio_fonts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `image_studio_fonts` ADD CONSTRAINT `isf_uploaded_by_fk` FOREIGN KEY (`uploadedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

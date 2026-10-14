CREATE TABLE `admin_push_preferences` (
	`adminId` int NOT NULL,
	`notifyTuitions` boolean NOT NULL DEFAULT true,
	`notifyApplications` boolean NOT NULL DEFAULT true,
	`notifyPayments` boolean NOT NULL DEFAULT true,
	`notifyRegistrations` boolean NOT NULL DEFAULT true,
	`notifyChat` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_push_preferences_adminId` PRIMARY KEY(`adminId`)
);
--> statement-breakpoint
ALTER TABLE `admin_push_preferences` ADD CONSTRAINT `app_admin_fk` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

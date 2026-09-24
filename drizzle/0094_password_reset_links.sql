CREATE TABLE `password_reset_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`createdByUserId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_links_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `password_reset_links` ADD CONSTRAINT `password_reset_links_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_links` ADD CONSTRAINT `password_reset_links_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `password_reset_links_user_idx` ON `password_reset_links` (`userId`);--> statement-breakpoint
ALTER TABLE `auth_events` MODIFY COLUMN `event` enum('login_success','login_failure','login_blocked','login_account_suspended','login_account_closed','registration_success','registration_rejected','registration_blocked','phone_intake','phone_intake_blocked','password_reset_link_created','password_reset_completed') NOT NULL;

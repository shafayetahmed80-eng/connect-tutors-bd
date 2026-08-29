CREATE TABLE `tutor_portal_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_portal_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutor_portal_sessions_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `tutor_portal_sessions` ADD CONSTRAINT `tutor_portal_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_portal_sessions_user_state_idx` ON `tutor_portal_sessions` (`userId`,`revokedAt`,`expiresAt`);
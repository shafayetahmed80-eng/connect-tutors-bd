CREATE TABLE `admin_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`createdByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_invitations_token_hash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `admin_login_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320),
	`event` enum('login_success','login_failure','two_factor_required','two_factor_success','two_factor_failure','recovery_code_used','invitation_created','invitation_accepted','invitation_revoked','two_factor_reset') NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_login_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_two_factor_recovery_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_two_factor_recovery_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_2fa_recovery_codes_hash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `admin_two_factor_settings` (
	`userId` int NOT NULL,
	`secretCiphertext` varchar(512) NOT NULL,
	`enabledAt` timestamp NOT NULL,
	`lastVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_two_factor_settings_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
ALTER TABLE `admin_invitations` ADD CONSTRAINT `admin_invitations_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_invitations` ADD CONSTRAINT `admin_invitations_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_login_audit_logs` ADD CONSTRAINT `admin_login_audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_two_factor_recovery_codes` ADD CONSTRAINT `admin_two_factor_recovery_codes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_two_factor_settings` ADD CONSTRAINT `admin_two_factor_settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `admin_invitations_email_status_idx` ON `admin_invitations` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `admin_invitations_status_expiry_idx` ON `admin_invitations` (`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `admin_login_audit_logs_user_created_idx` ON `admin_login_audit_logs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_login_audit_logs_event_created_idx` ON `admin_login_audit_logs` (`event`,`createdAt`);--> statement-breakpoint
CREATE INDEX `admin_2fa_recovery_codes_user_used_idx` ON `admin_two_factor_recovery_codes` (`userId`,`usedAt`);
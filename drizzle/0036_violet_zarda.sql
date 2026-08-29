CREATE TABLE `admin_credentials` (
	`userId` int NOT NULL,
	`loginId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_credentials_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `admin_credentials_loginId_unique` UNIQUE(`loginId`)
);
--> statement-breakpoint
ALTER TABLE `admin_login_audit_logs` MODIFY COLUMN `event` enum('login_success','login_failure','two_factor_required','two_factor_success','two_factor_failure','recovery_code_used','invitation_created','invitation_accepted','invitation_revoked','two_factor_reset','credential_provisioned','credential_reset') NOT NULL;
--> statement-breakpoint
ALTER TABLE `admin_credentials` ADD CONSTRAINT `admin_credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

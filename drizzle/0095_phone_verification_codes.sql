CREATE TABLE `phone_verification_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(16) NOT NULL,
	`purpose` enum('tutor_registration','guardian_intake') NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phone_verification_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `phone_verification_codes_phone_purpose_idx` ON `phone_verification_codes` (`phone`,`purpose`,`createdAt`);--> statement-breakpoint
ALTER TABLE `auth_events` MODIFY COLUMN `event` enum('login_success','login_failure','login_blocked','login_account_suspended','login_account_closed','registration_success','registration_rejected','registration_blocked','phone_intake','phone_intake_blocked','password_reset_link_created','password_reset_completed','phone_code_sent','phone_code_rejected','phone_verified') NOT NULL;

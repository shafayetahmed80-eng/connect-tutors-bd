ALTER TABLE `admin_two_factor_settings` ADD COLUMN `smsPhone` varchar(16);
--> statement-breakpoint
ALTER TABLE `admin_two_factor_settings` ADD COLUMN `smsPhoneVerifiedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `phone_verification_codes` MODIFY COLUMN `purpose` enum('tutor_registration','guardian_intake','password_reset','mobile_change','admin_two_factor') NOT NULL;

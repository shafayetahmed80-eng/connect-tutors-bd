ALTER TABLE `users` ADD `sessionsValidFrom` timestamp NULL;--> statement-breakpoint
-- UTC_TIMESTAMP(), not NOW(): the app reads every stored time as UTC, and NOW() is the database server's own clock (Asia/Dhaka on the live host), which put this six hours in the future.
UPDATE `users` SET `sessionsValidFrom` = UTC_TIMESTAMP() WHERE `role` = 'admin';--> statement-breakpoint
ALTER TABLE `admin_login_audit_logs` MODIFY COLUMN `event` enum('login_success','login_failure','two_factor_required','two_factor_success','two_factor_failure','recovery_code_used','invitation_created','invitation_accepted','invitation_revoked','two_factor_reset','credential_provisioned','credential_reset','sessions_ended') NOT NULL;

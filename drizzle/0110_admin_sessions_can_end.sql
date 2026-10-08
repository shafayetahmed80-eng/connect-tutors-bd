ALTER TABLE `users` ADD `sessionsValidFrom` timestamp NULL;--> statement-breakpoint
UPDATE `users` SET `sessionsValidFrom` = NOW() WHERE `role` = 'admin';--> statement-breakpoint
ALTER TABLE `admin_login_audit_logs` MODIFY COLUMN `event` enum('login_success','login_failure','two_factor_required','two_factor_success','two_factor_failure','recovery_code_used','invitation_created','invitation_accepted','invitation_revoked','two_factor_reset','credential_provisioned','credential_reset','sessions_ended') NOT NULL;

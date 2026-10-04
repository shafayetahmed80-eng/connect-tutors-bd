ALTER TABLE `phone_verification_codes` MODIFY COLUMN `purpose` enum('tutor_registration','guardian_intake','password_reset','mobile_change','admin_two_factor','login_two_factor') NOT NULL;

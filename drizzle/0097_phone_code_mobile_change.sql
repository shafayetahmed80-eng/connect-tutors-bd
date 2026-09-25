ALTER TABLE `phone_verification_codes` MODIFY COLUMN `purpose` enum('tutor_registration','guardian_intake','password_reset','mobile_change') NOT NULL;

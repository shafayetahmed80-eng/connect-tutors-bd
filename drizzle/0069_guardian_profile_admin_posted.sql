ALTER TABLE `guardian_profiles` MODIFY COLUMN `gender` enum('male','female');--> statement-breakpoint
ALTER TABLE `guardian_profiles` MODIFY COLUMN `termsVersion` varchar(64);

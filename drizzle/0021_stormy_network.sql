ALTER TABLE `guardian_profiles` ADD `guardianId` varchar(12) NULL;--> statement-breakpoint
UPDATE `guardian_profiles`
SET `guardianId` = CONCAT('GDN-', UPPER(SUBSTRING(REPLACE(UUID(), '-', ''), 1, 8)))
WHERE `guardianId` IS NULL;--> statement-breakpoint
ALTER TABLE `guardian_profiles` MODIFY `guardianId` varchar(12) NOT NULL;--> statement-breakpoint
ALTER TABLE `guardian_profiles` ADD CONSTRAINT `guardian_profiles_guardian_id_unique` UNIQUE(`guardianId`);

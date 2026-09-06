-- The Guardian profile grows from four fields into a real profile with an
-- identity / anti-fraud verification marker an Admin flips
-- (unverified -> verified / rejected). Every new column is nullable and
-- optional; the profile stays editable and nothing here gates posting a
-- request. Pre-launch, demo data only.
ALTER TABLE `guardian_profiles`
  ADD COLUMN `additionalPhone` varchar(16),
  ADD COLUMN `religion` varchar(40),
  ADD COLUMN `nationality` varchar(60),
  ADD COLUMN `socialLinks` varchar(500),
  ADD COLUMN `addressDetails` varchar(255),
  ADD COLUMN `profession` varchar(120),
  ADD COLUMN `nidFrontKey` varchar(512),
  ADD COLUMN `nidBackKey` varchar(512),
  ADD COLUMN `emergencyContactName` varchar(120),
  ADD COLUMN `emergencyContactPhone` varchar(16),
  ADD COLUMN `emergencyContactRelation` varchar(60),
  ADD COLUMN `emergencyContactAddress` varchar(255),
  ADD COLUMN `emergencyContactProfession` varchar(120),
  ADD COLUMN `heardAboutUs` varchar(60),
  ADD COLUMN `verificationStatus` enum('unverified','verified','rejected') NOT NULL DEFAULT 'unverified',
  ADD COLUMN `verificationRejectionReason` varchar(280),
  ADD COLUMN `verifiedByAdminId` int,
  ADD COLUMN `verifiedAt` timestamp NULL;
--> statement-breakpoint
ALTER TABLE `guardian_profiles` ADD CONSTRAINT `guardian_profiles_verifiedByAdminId_users_id_fk` FOREIGN KEY (`verifiedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

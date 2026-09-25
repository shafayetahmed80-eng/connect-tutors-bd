ALTER TABLE `tutor_notifications` MODIFY COLUMN `type` enum('profile_moderation','interest_decision','appointment','confirmation_letter','account_change','payment','announcement') NOT NULL;

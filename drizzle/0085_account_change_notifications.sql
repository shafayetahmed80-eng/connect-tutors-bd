ALTER TABLE `guardian_request_notifications` MODIFY COLUMN `type` enum('lifecycle','follow_up','confirmation_letter_issued','verification','account_change') NOT NULL;
--> statement-breakpoint
ALTER TABLE `tutor_notifications` MODIFY COLUMN `type` enum('profile_moderation','interest_decision','appointment','confirmation_letter','account_change') NOT NULL;

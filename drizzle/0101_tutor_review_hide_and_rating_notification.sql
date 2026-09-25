ALTER TABLE `tutor_reviews` ADD `hiddenAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tutor_reviews` ADD `hiddenByAdminUserId` int;
--> statement-breakpoint
ALTER TABLE `tutor_reviews` ADD CONSTRAINT `tutor_reviews_hiddenByAdminUserId_users_id_fk` FOREIGN KEY (`hiddenByAdminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tutor_notifications` MODIFY COLUMN `type` enum('profile_moderation','interest_decision','appointment','confirmation_letter','account_change','payment','announcement','rating') NOT NULL;

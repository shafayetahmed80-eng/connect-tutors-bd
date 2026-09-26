ALTER TABLE `tutor_admin_chat_threads` ADD `claimedByAdminId` int;
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_messages` ADD `attachmentKey` varchar(512);
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_messages` ADD `attachmentContentType` varchar(100);
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_threads` ADD CONSTRAINT `tact_claimed_by_fk` FOREIGN KEY (`claimedByAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;

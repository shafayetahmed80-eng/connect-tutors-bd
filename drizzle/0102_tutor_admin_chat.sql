CREATE TABLE `tutor_admin_chat_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`lastMessageAt` timestamp,
	`lastMessagePreview` varchar(200),
	`tutorLastReadAt` timestamp,
	`adminLastReadAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_admin_chat_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tutor_admin_chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`senderRole` enum('tutor','admin') NOT NULL,
	`senderAdminId` int,
	`body` varchar(2000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_admin_chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_threads` ADD CONSTRAINT `tact_tutor_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_messages` ADD CONSTRAINT `tacm_thread_fk` FOREIGN KEY (`threadId`) REFERENCES `tutor_admin_chat_threads`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_messages` ADD CONSTRAINT `tacm_admin_fk` FOREIGN KEY (`senderAdminId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX `tutor_admin_chat_threads_tutor_unique` ON `tutor_admin_chat_threads` (`tutorId`);
--> statement-breakpoint
CREATE INDEX `tutor_admin_chat_threads_last_message_idx` ON `tutor_admin_chat_threads` (`lastMessageAt`);
--> statement-breakpoint
CREATE INDEX `tutor_admin_chat_messages_thread_created_idx` ON `tutor_admin_chat_messages` (`threadId`,`createdAt`);

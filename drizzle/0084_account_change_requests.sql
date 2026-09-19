CREATE TABLE `account_change_requests` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `role` enum('guardian','tutor','admin') NOT NULL,
  `type` enum('name','mobile','verification','close_account') NOT NULL,
  `currentValue` varchar(160),
  `requestedValue` varchar(160),
  `reason` varchar(280),
  `status` enum('pending','approved','declined','withdrawn') NOT NULL DEFAULT 'pending',
  `declineReason` varchar(280),
  `decidedByUserId` int,
  `decidedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `account_change_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account_change_requests` ADD CONSTRAINT `account_change_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `account_change_requests` ADD CONSTRAINT `account_change_requests_decidedByUserId_users_id_fk` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `account_change_requests_user_status_idx` ON `account_change_requests` (`userId`,`status`);
--> statement-breakpoint
CREATE INDEX `account_change_requests_status_created_idx` ON `account_change_requests` (`status`,`createdAt`);

ALTER TABLE `tutor_admin_chat_messages` ADD COLUMN `aiFeedback` enum('helpful','unhelpful');
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_messages` ADD COLUMN `aiFeedbackNote` varchar(255);
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_messages` ADD COLUMN `aiActionChips` json;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `guardian_ai_chat_threads` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `guardianUserId` int NOT NULL,
  `lastMessageAt` timestamp NULL,
  `lastMessagePreview` varchar(255),
  `aiEscalatedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `gact_user_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`),
  INDEX `guardian_ai_chat_threads_user_idx` (`guardianUserId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `guardian_ai_chat_messages` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `threadId` int NOT NULL,
  `senderRole` enum('guardian','assistant','admin') NOT NULL,
  `body` varchar(2000) NOT NULL,
  `isAiGenerated` boolean NOT NULL DEFAULT false,
  `aiFeedback` enum('helpful','unhelpful'),
  `aiActionChips` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `gacm_thread_fk` FOREIGN KEY (`threadId`) REFERENCES `guardian_ai_chat_threads`(`id`),
  INDEX `guardian_ai_chat_messages_thread_idx` (`threadId`, `createdAt`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_knowledge_faqs` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `question` varchar(500) NOT NULL,
  `answer` text NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'general',
  `audience` enum('all','tutor','guardian') NOT NULL DEFAULT 'all',
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now())
);

ALTER TABLE `tutor_admin_chat_threads` ADD `aiAutoReply` boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_threads` ADD `aiEscalatedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `tutor_admin_chat_messages` ADD `isAiGenerated` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_chat_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`welcomeMessage` varchar(500) NOT NULL DEFAULT 'আসসালামু আলাইকুম! কানেক্ট টিউটরস এআই সাপোর্ট অ্যাসিস্ট্যান্টে স্বাগতম। আপনার যেকোনো প্রশ্নে সাহায্য করতে প্রস্তুত।',
	`systemPrompt` text,
	`fallbackMessage` varchar(500) NOT NULL DEFAULT 'আপনার প্রশ্নটি বুঝতে পেরেছি। বিষয়টি আরও বিশদভাবে খতিয়ে দেখতে আমাদের এডমিন টিমকে জানানো হয়েছে, শীঘ্রই একজন এডমিন রিপ্লাই করবেন।',
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_chat_settings_id` PRIMARY KEY(`id`)
);

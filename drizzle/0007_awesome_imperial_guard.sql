ALTER TABLE `tutors` MODIFY COLUMN `initials` varchar(8);--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `accent` varchar(20);--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `headline` varchar(240);--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `institution` varchar(240);--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `education` varchar(240);--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `subjects` text;--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `levels` text;--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `experience` int;--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `fee` int;--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `mode` enum('home','online','both');--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `availability` varchar(160);--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `profileStatus` enum('draft','pending','changes_requested','approved','suspended') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `languages` text;--> statement-breakpoint
ALTER TABLE `tutors` MODIFY COLUMN `about` text;--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','suspended','closed') DEFAULT 'active' NOT NULL;
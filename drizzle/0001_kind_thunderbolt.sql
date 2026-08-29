ALTER TABLE `tutors` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `tutors` ADD `contactEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `tutors` ADD `profileStatus` enum('draft','pending','approved') DEFAULT 'draft' NOT NULL;
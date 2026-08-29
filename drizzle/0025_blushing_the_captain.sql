ALTER TABLE `tutor_jobs` MODIFY COLUMN `tuitionType` enum('home','online','both','group','package') NOT NULL;--> statement-breakpoint
ALTER TABLE `tutor_requests` MODIFY COLUMN `tuitionType` enum('home','online','both','group','package') NOT NULL;--> statement-breakpoint
ALTER TABLE `tutor_jobs` MODIFY COLUMN `tuitionType` enum('home','online','both','group','package') NOT NULL;

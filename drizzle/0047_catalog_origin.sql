ALTER TABLE `class_levels` ADD `origin` varchar(10) DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE `curricula` ADD `origin` varchar(10) DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE `faculty_departments` ADD `origin` varchar(10) DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE `languages_catalog` ADD `origin` varchar(10) DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE `student_types` ADD `origin` varchar(10) DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE `subjects_catalog` ADD `origin` varchar(10) DEFAULT 'seed' NOT NULL;--> statement-breakpoint
ALTER TABLE `universities` ADD `origin` varchar(10) DEFAULT 'seed' NOT NULL;
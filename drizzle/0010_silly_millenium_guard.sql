CREATE TABLE `academic_faculties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`universityId` int NOT NULL,
	`name` varchar(240) NOT NULL,
	`normalizedName` varchar(240) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academic_faculties_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_faculties_university_normalized_unique` UNIQUE(`universityId`,`normalizedName`)
);
--> statement-breakpoint
ALTER TABLE `faculty_departments` DROP INDEX `faculty_departments_university_normalized_unique`;--> statement-breakpoint
ALTER TABLE `faculty_departments` ADD `facultyId` int;--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD `facultyId` int;--> statement-breakpoint
ALTER TABLE `faculty_departments` ADD CONSTRAINT `faculty_departments_university_faculty_normalized_unique` UNIQUE(`universityId`,`facultyId`,`normalizedName`);--> statement-breakpoint
ALTER TABLE `academic_faculties` ADD CONSTRAINT `academic_faculties_universityId_universities_id_fk` FOREIGN KEY (`universityId`) REFERENCES `universities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `academic_faculties_parent_active_sort_idx` ON `academic_faculties` (`universityId`,`active`,`sortOrder`);--> statement-breakpoint
ALTER TABLE `faculty_departments` ADD CONSTRAINT `faculty_departments_facultyId_academic_faculties_id_fk` FOREIGN KEY (`facultyId`) REFERENCES `academic_faculties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD CONSTRAINT `tutor_academic_profiles_facultyId_academic_faculties_id_fk` FOREIGN KEY (`facultyId`) REFERENCES `academic_faculties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_academic_profiles_faculty_parent_idx` ON `tutor_academic_profiles` (`facultyId`);--> statement-breakpoint
CREATE INDEX `faculty_departments_faculty_active_sort_idx` ON `faculty_departments` (`facultyId`,`active`,`sortOrder`);

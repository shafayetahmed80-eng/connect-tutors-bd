CREATE TABLE `class_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `class_levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_levels_normalized_name_unique` UNIQUE(`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `curricula` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curricula_id` PRIMARY KEY(`id`),
	CONSTRAINT `curricula_normalized_name_unique` UNIQUE(`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `degree_majors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`facultyDepartmentId` int NOT NULL,
	`name` varchar(240) NOT NULL,
	`normalizedName` varchar(240) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `degree_majors_id` PRIMARY KEY(`id`),
	CONSTRAINT `degree_majors_faculty_normalized_unique` UNIQUE(`facultyDepartmentId`,`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `faculty_departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`universityId` int NOT NULL,
	`name` varchar(240) NOT NULL,
	`normalizedName` varchar(240) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `faculty_departments_id` PRIMARY KEY(`id`),
	CONSTRAINT `faculty_departments_university_normalized_unique` UNIQUE(`universityId`,`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `languages_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `languages_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `languages_catalog_normalized_name_unique` UNIQUE(`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `student_types` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_types_normalized_name_unique` UNIQUE(`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `subjects_catalog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`normalizedName` varchar(160) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_catalog_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_catalog_normalized_name_unique` UNIQUE(`normalizedName`)
);
--> statement-breakpoint
CREATE TABLE `tutor_academic_profiles` (
	`tutorId` varchar(32) NOT NULL,
	`highestEducation` varchar(160),
	`universityId` int,
	`facultyDepartmentId` int,
	`degreeMajorId` int,
	`currentStudyStatus` enum('studying','graduated','professional'),
	`graduationYear` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_academic_profiles_tutorId` PRIMARY KEY(`tutorId`)
);
--> statement-breakpoint
CREATE TABLE `tutor_class_levels` (
	`tutorId` varchar(32) NOT NULL,
	`classLevelId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_class_levels_tutorId_classLevelId_pk` PRIMARY KEY(`tutorId`,`classLevelId`)
);
--> statement-breakpoint
CREATE TABLE `tutor_communication_preferences` (
	`tutorId` varchar(32) NOT NULL,
	`channel` enum('phone','whatsapp','platform_message') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_communication_preferences_tutorId_channel_pk` PRIMARY KEY(`tutorId`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `tutor_curricula` (
	`tutorId` varchar(32) NOT NULL,
	`curriculumId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_curricula_tutorId_curriculumId_pk` PRIMARY KEY(`tutorId`,`curriculumId`)
);
--> statement-breakpoint
CREATE TABLE `tutor_preferred_class_sizes` (
	`tutorId` varchar(32) NOT NULL,
	`classSize` enum('one_to_one','small_group','group') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_preferred_class_sizes_tutorId_classSize_pk` PRIMARY KEY(`tutorId`,`classSize`)
);
--> statement-breakpoint
CREATE TABLE `tutor_preferred_teaching_days` (
	`tutorId` varchar(32) NOT NULL,
	`dayOfWeek` enum('saturday','sunday','monday','tuesday','wednesday','thursday','friday') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_preferred_teaching_days_tutorId_dayOfWeek_pk` PRIMARY KEY(`tutorId`,`dayOfWeek`)
);
--> statement-breakpoint
CREATE TABLE `tutor_preferred_time_slots` (
	`tutorId` varchar(32) NOT NULL,
	`timeSlot` enum('morning','afternoon','evening','flexible') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_preferred_time_slots_tutorId_timeSlot_pk` PRIMARY KEY(`tutorId`,`timeSlot`)
);
--> statement-breakpoint
CREATE TABLE `tutor_student_types` (
	`tutorId` varchar(32) NOT NULL,
	`studentTypeId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_student_types_tutorId_studentTypeId_pk` PRIMARY KEY(`tutorId`,`studentTypeId`)
);
--> statement-breakpoint
CREATE TABLE `tutor_subjects` (
	`tutorId` varchar(32) NOT NULL,
	`subjectId` int NOT NULL,
	`selectionType` enum('primary','additional') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_subjects_tutorId_subjectId_selectionType_pk` PRIMARY KEY(`tutorId`,`subjectId`,`selectionType`)
);
--> statement-breakpoint
CREATE TABLE `tutor_teaching_areas` (
	`tutorId` varchar(32) NOT NULL,
	`locationId` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_teaching_areas_tutorId_locationId_pk` PRIMARY KEY(`tutorId`,`locationId`)
);
--> statement-breakpoint
CREATE TABLE `tutor_teaching_languages` (
	`tutorId` varchar(32) NOT NULL,
	`languageId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_teaching_languages_tutorId_languageId_pk` PRIMARY KEY(`tutorId`,`languageId`)
);
--> statement-breakpoint
CREATE TABLE `universities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(240) NOT NULL,
	`normalizedName` varchar(240) NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `universities_id` PRIMARY KEY(`id`),
	CONSTRAINT `universities_normalized_name_unique` UNIQUE(`normalizedName`)
);
--> statement-breakpoint
ALTER TABLE `tutors` ADD `profilePhotoKey` varchar(512);--> statement-breakpoint
ALTER TABLE `tutors` ADD `dateOfBirth` date;--> statement-breakpoint
ALTER TABLE `tutors` ADD `nationwideAvailability` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tutors` ADD `teachingExperienceYears` int;--> statement-breakpoint
ALTER TABLE `tutors` ADD `priorTeachingExperience` text;--> statement-breakpoint
ALTER TABLE `tutors` ADD `specialExpertise` text;--> statement-breakpoint
ALTER TABLE `tutors` ADD `academicAchievement` text;--> statement-breakpoint
ALTER TABLE `tutors` ADD `monthlyFeeMin` int;--> statement-breakpoint
ALTER TABLE `tutors` ADD `monthlyFeeMax` int;--> statement-breakpoint
ALTER TABLE `tutors` ADD `travelDistanceKm` int;--> statement-breakpoint
ALTER TABLE `tutors` ADD `preferredStudentGender` enum('male','female','both');--> statement-breakpoint
ALTER TABLE `tutors` ADD `teachingApproach` text;--> statement-breakpoint
ALTER TABLE `tutors` ADD `whyChooseMe` text;--> statement-breakpoint
ALTER TABLE `tutors` ADD `additionalNotes` text;--> statement-breakpoint
ALTER TABLE `degree_majors` ADD CONSTRAINT `degree_majors_facultyDepartmentId_faculty_departments_id_fk` FOREIGN KEY (`facultyDepartmentId`) REFERENCES `faculty_departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `faculty_departments` ADD CONSTRAINT `faculty_departments_universityId_universities_id_fk` FOREIGN KEY (`universityId`) REFERENCES `universities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD CONSTRAINT `tutor_academic_profiles_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD CONSTRAINT `tutor_academic_profiles_universityId_universities_id_fk` FOREIGN KEY (`universityId`) REFERENCES `universities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD CONSTRAINT `tap_faculty_department_fk` FOREIGN KEY (`facultyDepartmentId`) REFERENCES `faculty_departments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD CONSTRAINT `tutor_academic_profiles_degreeMajorId_degree_majors_id_fk` FOREIGN KEY (`degreeMajorId`) REFERENCES `degree_majors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_class_levels` ADD CONSTRAINT `tutor_class_levels_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_class_levels` ADD CONSTRAINT `tutor_class_levels_classLevelId_class_levels_id_fk` FOREIGN KEY (`classLevelId`) REFERENCES `class_levels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_communication_preferences` ADD CONSTRAINT `tutor_communication_preferences_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_curricula` ADD CONSTRAINT `tutor_curricula_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_curricula` ADD CONSTRAINT `tutor_curricula_curriculumId_curricula_id_fk` FOREIGN KEY (`curriculumId`) REFERENCES `curricula`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_preferred_class_sizes` ADD CONSTRAINT `tutor_preferred_class_sizes_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_preferred_teaching_days` ADD CONSTRAINT `tutor_preferred_teaching_days_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_preferred_time_slots` ADD CONSTRAINT `tutor_preferred_time_slots_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_student_types` ADD CONSTRAINT `tutor_student_types_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_student_types` ADD CONSTRAINT `tutor_student_types_studentTypeId_student_types_id_fk` FOREIGN KEY (`studentTypeId`) REFERENCES `student_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_subjects` ADD CONSTRAINT `tutor_subjects_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_subjects` ADD CONSTRAINT `tutor_subjects_subjectId_subjects_catalog_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `subjects_catalog`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_teaching_areas` ADD CONSTRAINT `tutor_teaching_areas_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_teaching_areas` ADD CONSTRAINT `tutor_teaching_areas_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_teaching_languages` ADD CONSTRAINT `tutor_teaching_languages_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_teaching_languages` ADD CONSTRAINT `tutor_teaching_languages_languageId_languages_catalog_id_fk` FOREIGN KEY (`languageId`) REFERENCES `languages_catalog`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `class_levels_active_sort_idx` ON `class_levels` (`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `curricula_active_sort_idx` ON `curricula` (`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `degree_majors_parent_active_sort_idx` ON `degree_majors` (`facultyDepartmentId`,`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `faculty_departments_parent_active_sort_idx` ON `faculty_departments` (`universityId`,`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `languages_catalog_active_sort_idx` ON `languages_catalog` (`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `student_types_active_sort_idx` ON `student_types` (`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `subjects_catalog_active_sort_idx` ON `subjects_catalog` (`active`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `tutor_academic_profiles_university_idx` ON `tutor_academic_profiles` (`universityId`);--> statement-breakpoint
CREATE INDEX `tutor_academic_profiles_faculty_idx` ON `tutor_academic_profiles` (`facultyDepartmentId`);--> statement-breakpoint
CREATE INDEX `tutor_academic_profiles_degree_idx` ON `tutor_academic_profiles` (`degreeMajorId`);--> statement-breakpoint
CREATE INDEX `tutor_class_levels_catalog_idx` ON `tutor_class_levels` (`classLevelId`);--> statement-breakpoint
CREATE INDEX `tutor_curricula_catalog_idx` ON `tutor_curricula` (`curriculumId`);--> statement-breakpoint
CREATE INDEX `tutor_student_types_catalog_idx` ON `tutor_student_types` (`studentTypeId`);--> statement-breakpoint
CREATE INDEX `tutor_subjects_subject_idx` ON `tutor_subjects` (`subjectId`);--> statement-breakpoint
CREATE INDEX `tutor_teaching_areas_location_idx` ON `tutor_teaching_areas` (`locationId`);--> statement-breakpoint
CREATE INDEX `tutor_teaching_languages_catalog_idx` ON `tutor_teaching_languages` (`languageId`);--> statement-breakpoint
CREATE INDEX `universities_active_sort_idx` ON `universities` (`active`,`sortOrder`);

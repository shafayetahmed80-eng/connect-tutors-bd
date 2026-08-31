-- Remove the Faculty layer from the Institute catalog.
--   Institute -> Faculty -> Department/Subject   becomes   Institute -> Department/Subject
-- `academic_faculties` is dropped; `faculty_departments` becomes one flat global
-- Department/Subject vocabulary (no universityId, no facultyId). Existing tutor
-- Faculty and Department selections are cleared — tutors re-pick the subject.
-- Destructive and one-way. Run `node scripts/seed-tutor-profile-catalog.mjs`
-- afterwards to repopulate the global Department/Subject list.

UPDATE `tutor_academic_profiles` SET `facultyDepartmentId` = NULL, `facultyId` = NULL, `degreeMajorId` = NULL;--> statement-breakpoint
DELETE FROM `degree_majors`;--> statement-breakpoint

ALTER TABLE `tutor_academic_profiles` DROP FOREIGN KEY `tutor_academic_profiles_facultyId_academic_faculties_id_fk`;--> statement-breakpoint
ALTER TABLE `faculty_departments` DROP FOREIGN KEY `faculty_departments_facultyId_academic_faculties_id_fk`;--> statement-breakpoint
ALTER TABLE `faculty_departments` DROP FOREIGN KEY `faculty_departments_universityId_universities_id_fk`;--> statement-breakpoint

DROP TABLE `academic_faculties`;--> statement-breakpoint
DELETE FROM `faculty_departments`;--> statement-breakpoint

ALTER TABLE `faculty_departments` DROP INDEX `faculty_departments_university_faculty_normalized_unique`;--> statement-breakpoint
DROP INDEX `faculty_departments_parent_active_sort_idx` ON `faculty_departments`;--> statement-breakpoint
DROP INDEX `faculty_departments_faculty_active_sort_idx` ON `faculty_departments`;--> statement-breakpoint
DROP INDEX `tutor_academic_profiles_faculty_parent_idx` ON `tutor_academic_profiles`;--> statement-breakpoint

ALTER TABLE `faculty_departments` DROP COLUMN `facultyId`;--> statement-breakpoint
ALTER TABLE `faculty_departments` DROP COLUMN `universityId`;--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` DROP COLUMN `facultyId`;--> statement-breakpoint

ALTER TABLE `faculty_departments` ADD CONSTRAINT `faculty_departments_normalized_unique` UNIQUE(`normalizedName`);--> statement-breakpoint
CREATE INDEX `faculty_departments_active_sort_idx` ON `faculty_departments` (`active`,`sortOrder`);

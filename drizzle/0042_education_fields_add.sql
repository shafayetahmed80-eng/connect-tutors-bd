-- Education section rework, part 1 of 2: add the new columns.
-- Part 2 (`0043`) drops the legacy date/passing-year columns once the values
-- below have been carried across, so this migration stays reversible-ish and
-- never loses a Tutor's qualification dates in a single irreversible step.

ALTER TABLE `tutor_academic_profiles` ADD `degreeExamTitle` varchar(160);--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD `resultGpa` varchar(80);--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD `deptId` varchar(80);--> statement-breakpoint
ALTER TABLE `tutor_academic_profiles` ADD `yearSemester` varchar(80);--> statement-breakpoint

-- Qualification history now stores plain four-digit years. Add the columns
-- nullable first so existing rows survive, carry the year over from the old
-- date columns, then lock the start year down to match the schema.
ALTER TABLE `tutor_education_records` ADD `studyStartYear` int;--> statement-breakpoint
ALTER TABLE `tutor_education_records` ADD `studyEndYear` int;--> statement-breakpoint
UPDATE `tutor_education_records` SET `studyStartYear` = YEAR(`studyStartDate`);--> statement-breakpoint
UPDATE `tutor_education_records` SET `studyEndYear` = COALESCE(YEAR(`studyEndDate`), `passingYear`);--> statement-breakpoint
UPDATE `tutor_education_records` SET `studyStartYear` = 1950 WHERE `studyStartYear` IS NULL OR `studyStartYear` = 0;--> statement-breakpoint
ALTER TABLE `tutor_education_records` MODIFY COLUMN `studyStartYear` int NOT NULL;

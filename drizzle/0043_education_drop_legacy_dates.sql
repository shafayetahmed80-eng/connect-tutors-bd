-- Education section rework, part 2 of 2: drop the legacy date columns.
-- `0042` already copied every value into `studyStartYear` / `studyEndYear`,
-- and `passingYear` is folded into `studyEndYear`. Destructive and one-way.

ALTER TABLE `tutor_education_records` DROP COLUMN `studyStartDate`;--> statement-breakpoint
ALTER TABLE `tutor_education_records` DROP COLUMN `studyEndDate`;--> statement-breakpoint
ALTER TABLE `tutor_education_records` DROP COLUMN `passingYear`;
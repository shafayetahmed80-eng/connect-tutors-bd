-- These 5 columns were hard-required at the database level, matching the old
-- always-required Zod schema. The Tutor Profile field config (0062) can now
-- make any of them optional, and Zod already loosened them to `.optional()` -
-- the database must stop refusing a draft that omits one, the same way
-- `curriculum` was already nullable for exactly this reason.
ALTER TABLE `tutor_education_records` MODIFY COLUMN `qualificationLevel` varchar(80);--> statement-breakpoint
ALTER TABLE `tutor_education_records` MODIFY COLUMN `instituteName` varchar(200);--> statement-breakpoint
ALTER TABLE `tutor_education_records` MODIFY COLUMN `degreeExamTitle` varchar(160);--> statement-breakpoint
ALTER TABLE `tutor_education_records` MODIFY COLUMN `majorGroup` varchar(160);--> statement-breakpoint
ALTER TABLE `tutor_education_records` MODIFY COLUMN `studyStartYear` int;

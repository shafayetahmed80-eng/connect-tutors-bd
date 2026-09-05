-- The Tutor Profile drops its "Language & communication" sub-section. The two
-- junction tables it wrote to and the `languages_catalog` reference list they
-- fed all go with it. The site is pre-launch with only demo data, so the rows
-- are not preserved (unlike the Student Types removal, which kept its table).
-- Destructive and one-way. Drop the child tables first so `languages_catalog`
-- is no longer the target of a foreign key by the time it is dropped.
DROP TABLE `tutor_teaching_languages`;--> statement-breakpoint
DROP TABLE `tutor_communication_preferences`;--> statement-breakpoint
DROP TABLE `languages_catalog`;

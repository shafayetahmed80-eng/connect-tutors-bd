-- A request can now ask for several curricula, and several classes in each, with a list of
-- subjects for every class. The request keeps its category, classCourse and subjects columns as a
-- one-line summary (so a card, a title, a search and a letter read it as they always did), and the
-- exact curriculum-and-class pairs go in their own rows for the filters to read.
--
-- classCourse gets room for six classes named in one line. Every request that exists becomes one
-- row in the new table, so nothing a request says changes. Nothing is deleted.
ALTER TABLE `tutor_requests` MODIFY COLUMN `classCourse` varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE `tutor_jobs` MODIFY COLUMN `classCourse` varchar(500) NOT NULL;--> statement-breakpoint
CREATE TABLE `tutor_request_learning_needs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`category` varchar(120) NOT NULL,
	`curriculumType` varchar(32),
	`classCourse` varchar(120) NOT NULL,
	`subjects` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `tutor_request_learning_needs_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
ALTER TABLE `tutor_request_learning_needs` ADD CONSTRAINT `trln_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_request_learning_needs_request_idx` ON `tutor_request_learning_needs` (`tutorRequestId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `tutor_request_learning_needs_pair_idx` ON `tutor_request_learning_needs` (`category`,`classCourse`);--> statement-breakpoint
INSERT INTO `tutor_request_learning_needs` (`tutorRequestId`, `category`, `curriculumType`, `classCourse`, `subjects`, `sortOrder`)
SELECT `id`, `category`, `curriculumType`, `classCourse`, `subjects`, 0 FROM `tutor_requests`;

ALTER TABLE `tutors` DROP COLUMN `mode`;
--> statement-breakpoint
CREATE TABLE `tutor_tuition_modes` (
	`tutorId` varchar(32) NOT NULL,
	`mode` enum('home','online','group','package') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_tuition_modes_tutorId_mode_pk` PRIMARY KEY(`tutorId`,`mode`)
);
--> statement-breakpoint
ALTER TABLE `tutor_tuition_modes` ADD CONSTRAINT `tutor_tuition_modes_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;

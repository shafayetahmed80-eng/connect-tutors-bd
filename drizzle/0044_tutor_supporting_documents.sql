CREATE TABLE `tutor_supporting_documents` (
	`tutorId` varchar(32) NOT NULL,
	`documentType` varchar(40) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_supporting_documents_tutorId_documentType_pk` PRIMARY KEY(`tutorId`,`documentType`)
);
--> statement-breakpoint
ALTER TABLE `tutor_supporting_documents` ADD CONSTRAINT `tutor_supporting_documents_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_supporting_documents_tutor_idx` ON `tutor_supporting_documents` (`tutorId`);
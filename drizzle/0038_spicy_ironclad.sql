CREATE TABLE `tutor_education_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`qualificationLevel` varchar(80) NOT NULL,
	`instituteName` varchar(200) NOT NULL,
	`degreeExamTitle` varchar(160) NOT NULL,
	`majorGroup` varchar(160) NOT NULL,
	`resultGpa` varchar(80),
	`curriculum` varchar(80),
	`studyStartDate` date NOT NULL,
	`studyEndDate` date,
	`passingYear` int,
	`currentlyStudying` int NOT NULL DEFAULT 0,
	`instituteIdCardNumber` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_education_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tutor_private_profiles` (
	`tutorId` varchar(32) NOT NULL,
	`additionalPhone` varchar(20),
	`presentAddress` text,
	`permanentAddress` text,
	`nationality` varchar(80),
	`religion` varchar(80),
	`socialProfileLinks` text,
	`fatherName` varchar(160),
	`fatherPhone` varchar(20),
	`motherName` varchar(160),
	`motherPhone` varchar(20),
	`emergencyContactName` varchar(160),
	`emergencyContactRelation` varchar(80),
	`emergencyContactPhone` varchar(20),
	`emergencyContactAddress` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_private_profiles_tutorId` PRIMARY KEY(`tutorId`)
);
--> statement-breakpoint
CREATE TABLE `tutor_university_id_documents` (
	`tutorId` varchar(32) NOT NULL,
	`storageKey` varchar(512),
	`documentStatus` enum('not_uploaded','uploaded','pending','approved','changes_requested') NOT NULL DEFAULT 'not_uploaded',
	`uploadedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_university_id_documents_tutorId` PRIMARY KEY(`tutorId`)
);
--> statement-breakpoint
ALTER TABLE `tutor_education_records` ADD CONSTRAINT `tutor_education_records_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_private_profiles` ADD CONSTRAINT `tutor_private_profiles_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_university_id_documents` ADD CONSTRAINT `tutor_university_id_documents_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_education_records_tutor_idx` ON `tutor_education_records` (`tutorId`);
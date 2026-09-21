ALTER TABLE `tuition_payments` MODIFY COLUMN `method` enum('bkash','nagad','rocket','bank','cash','other','credit') NOT NULL;
--> statement-breakpoint
CREATE TABLE `tuition_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`reason` enum('guardian_valid','tutor_fault','late_notice','other') NOT NULL,
	`receivedSalary` int,
	`retained` int NOT NULL,
	`paidAtSettlement` int NOT NULL,
	`refundAmount` int NOT NULL DEFAULT 0,
	`dueAmount` int NOT NULL DEFAULT 0,
	`disposition` enum('none','refunded','credited') NOT NULL DEFAULT 'none',
	`note` varchar(280),
	`decidedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tuition_settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `tuition_settlements_request_unique` UNIQUE(`tutorRequestId`)
);
--> statement-breakpoint
ALTER TABLE `tuition_settlements` ADD CONSTRAINT `tuition_settlements_tutorRequestId_tutor_requests_id_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tuition_settlements` ADD CONSTRAINT `tuition_settlements_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tuition_settlements` ADD CONSTRAINT `tuition_settlements_decidedByUserId_users_id_fk` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tuition_settlements_tutor_idx` ON `tuition_settlements` (`tutorId`,`disposition`);

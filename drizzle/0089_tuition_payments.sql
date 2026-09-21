ALTER TABLE `tutor_requests` ADD `chargeTerms` text;
--> statement-breakpoint
CREATE TABLE `tuition_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`tutorId` varchar(32) NOT NULL,
	`amount` int NOT NULL,
	`method` enum('bkash','nagad','rocket','bank','cash','other') NOT NULL,
	`reference` varchar(80),
	`status` enum('submitted','verified','rejected') NOT NULL DEFAULT 'submitted',
	`source` enum('manual','gateway') NOT NULL DEFAULT 'manual',
	`provider` varchar(40),
	`gatewayTxnId` varchar(120),
	`paidAt` timestamp NOT NULL,
	`note` varchar(280),
	`recordedByUserId` int,
	`decidedByUserId` int,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tuition_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `tuition_payments_gateway_txn_unique` UNIQUE(`gatewayTxnId`)
);
--> statement-breakpoint
ALTER TABLE `tuition_payments` ADD CONSTRAINT `tuition_payments_tutorRequestId_tutor_requests_id_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tuition_payments` ADD CONSTRAINT `tuition_payments_tutorId_tutors_id_fk` FOREIGN KEY (`tutorId`) REFERENCES `tutors`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tuition_payments` ADD CONSTRAINT `tuition_payments_recordedByUserId_users_id_fk` FOREIGN KEY (`recordedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `tuition_payments` ADD CONSTRAINT `tuition_payments_decidedByUserId_users_id_fk` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `tuition_payments_request_idx` ON `tuition_payments` (`tutorRequestId`,`status`);
--> statement-breakpoint
CREATE INDEX `tuition_payments_tutor_idx` ON `tuition_payments` (`tutorId`);

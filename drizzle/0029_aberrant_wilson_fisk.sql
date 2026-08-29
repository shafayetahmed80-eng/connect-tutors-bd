CREATE TABLE `tutor_request_operation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorRequestId` int NOT NULL,
	`guardianUserId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('guardian_updated','admin_confirmed','admin_cancelled') NOT NULL,
	`changedFields` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_request_operation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `appointmentConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `cancellationReason` varchar(280);--> statement-breakpoint
ALTER TABLE `tutor_request_operation_events` ADD CONSTRAINT `tr_op_event_request_fk` FOREIGN KEY (`tutorRequestId`) REFERENCES `tutor_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_request_operation_events` ADD CONSTRAINT `tr_op_event_guardian_fk` FOREIGN KEY (`guardianUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tutor_request_operation_events` ADD CONSTRAINT `tr_op_event_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tutor_request_operation_events_request_created_idx` ON `tutor_request_operation_events` (`tutorRequestId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tutor_request_operation_events_guardian_created_idx` ON `tutor_request_operation_events` (`guardianUserId`,`createdAt`);

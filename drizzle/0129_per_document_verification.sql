ALTER TABLE `tutor_university_id_documents` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `tutor_university_id_documents` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tutor_university_id_documents` ADD `verifiedBy` varchar(64);--> statement-breakpoint
ALTER TABLE `tutor_supporting_documents` ADD `documentStatus` enum('uploaded','pending','approved','changes_requested') DEFAULT 'uploaded' NOT NULL;--> statement-breakpoint
ALTER TABLE `tutor_supporting_documents` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `tutor_supporting_documents` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `tutor_supporting_documents` ADD `verifiedBy` varchar(64);
